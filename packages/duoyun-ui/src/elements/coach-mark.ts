// https://spectrum.adobe.com/page/coach-mark/
import { connectStore, adoptedStyle, customElement, attribute, numattribute } from '@mantou/gem/lib/decorators';
import { html } from '@mantou/gem/lib/element';
import { createCSSSheet, css } from '@mantou/gem/lib/utils';
import { createStore, updateStore } from '@mantou/gem/lib/store';
import { splice } from '@mantou/gem/helper/i18n';

import { theme } from '../lib/theme';
import { locale } from '../lib/locale';

import { ContextMenu } from './menu';
import { DuoyunVisibleBaseElement } from './base/visible';

import './card';
import './paragraph';
import './button';

export type Tour = {
  title: string;
  description: string;
  before?: () => Promise<void> | void;
  preview?: string;
  /**only last tour */
  finish?: () => Promise<void> | void;
};
let tourList: Tour[] = [];

type Store = {
  currentIndex: number;
  opened: boolean;
};

const store = createStore<Store>({
  currentIndex: 0,
  opened: false,
});

export async function openTour(currentIndex = store.currentIndex) {
  if (!tourList[currentIndex]) throw new Error('missing tours');
  await tourList[currentIndex].before?.();
  updateStore(store, { opened: true, currentIndex });
}

export async function setTours(tours: Tour[], { opened = true, currentIndex = 0 }: Partial<Store> = {}) {
  if (tours.length === 0) throw new Error('missing tours');
  tourList = tours;
  await openTour(currentIndex);
  updateStore(store, { opened });
}

function closeTour() {
  updateStore(store, { opened: false });
}

function nextTour() {
  const isFinish = store.currentIndex === tourList.length - 1;
  if (isFinish) {
    updateStore(store, {
      currentIndex: 0,
      opened: false,
    });
    ContextMenu.close();
    tourList[store.currentIndex].finish?.();
  } else {
    openTour(store.currentIndex + 1);
  }
}

const style = createCSSSheet(css`
  :host {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 3em;
    aspect-ratio: 1;
    border-radius: 10em;
  }
  :host([size='small']) {
    transform: translate(-50%, -50%) scale(0.8);
  }
  :host([size='large']) {
    transform: translate(-50%, -50%) scale(1.2);
  }
  .ring {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    border: 6px solid currentColor;
    opacity: 0;
    transform: scale(1.2);
    animation: glow-grow 2s ease-out infinite;
  }
  .ring:nth-of-type(2) {
    animation-delay: 0.66s;
  }
  .ring:nth-of-type(3) {
    animation-delay: 1.33s;
  }
  @keyframes glow-grow {
    0% {
      opacity: 0;
      transform: scale(0.5);
    }
    66% {
      opacity: 1;
    }
    100% {
      border-width: 2px;
      opacity: 0;
      transform: scale(1);
    }
  }
`);

/**
 * parent element must is relative position
 *
 * @customElement dy-coach-mark
 * @attr index
 * @attr width
 * @attr size
 * @attr color
 */
@customElement('dy-coach-mark')
@adoptedStyle(style)
@connectStore(store)
@connectStore(locale)
export class DuoyunCoachMarkElement extends DuoyunVisibleBaseElement {
  @numattribute index: number;
  @attribute width: string;
  @attribute size: 'small' | 'medium' | 'large';
  @attribute color: string;

  get #tour() {
    return this.index === store.currentIndex && store.opened && tourList[this.index];
  }

  get #width() {
    return this.width || '16em';
  }

  constructor() {
    super();
    this.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.addEventListener('pointerup', (e) => e.stopPropagation());
    this.addEventListener('click', (e) => e.stopPropagation());
  }

  #skip = () => {
    ContextMenu.close();
    closeTour();
  };

  #open = async () => {
    if (!this.#tour) return;
    const { description, preview = '', title } = this.#tour;
    const isFinish = store.currentIndex === tourList.length - 1;
    this.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    if (!this.visibility) await new Promise((res) => this.addEventListener('visible', res, { once: true }));
    ContextMenu.open(
      html`
        <dy-card
          style="margin: -0.8em -1em; border: none; border-radius: 0;"
          .header=${title}
          .detailRight=${isFinish
            ? '🎉'
            : splice(locale.currentOfTotal, String(store.currentIndex + 1), String(tourList.length))}
          .preview=${preview}
        >
          <dy-paragraph slot="body">${description}</dy-paragraph>
          <div slot="footer">
            ${isFinish
              ? ''
              : html`<dy-button @click=${() => this.#skip()} small color="cancel">${locale.skipTour}</dy-button>`}
            <dy-button @click=${() => nextTour()} small>${isFinish ? locale.finishTour : locale.nextTour}</dy-button>
          </div>
        </dy-card>
      `,
      {
        activeElement: this,
        width: this.#width,
      },
    ).then(() => {
      closeTour();
    });
  };

  mounted = () => {
    this.effect(() => {
      if (this.#tour) {
        this.#open();
      }
    });
  };

  render = () => {
    if (!this.#tour) {
      return html`
        <style>
          :host {
            display: none;
          }
        </style>
      `;
    }
    return html`
      <style>
        :host {
          color: ${this.color || theme.informativeColor};
        }
      </style>
      <span class="ring"></span>
      <span class="ring"></span>
      <span class="ring"></span>
    `;
  };
}
