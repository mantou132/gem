// https://spectrum.adobe.com/page/coach-mark/
import {
  connectStore,
  adoptedStyle,
  customElement,
  attribute,
  numattribute,
  shadow,
  effect,
  mounted,
} from '@mantou/gem/lib/decorators';
import { html, css } from '@mantou/gem/lib/element';
import { addListener } from '@mantou/gem/lib/utils';
import { createStore } from '@mantou/gem/lib/store';
import { splice } from '@mantou/gem/helper/i18n';
import { createDecoratorTheme } from '@mantou/gem/helper/theme';

import { theme, getSemanticColor } from '../lib/theme';
import { locale } from '../lib/locale';

import { ContextMenu } from './contextmenu';
import { DuoyunVisibleBaseElement } from './base/visible';
import { DuoyunWaitElement } from './wait';

import './card';
import './paragraph';
import './button';

export type Tour = {
  title: string;
  description: string;
  before?: () => Promise<void> | void;
  preview?: string;
  finishText?: string;
  finish?: () => Promise<void> | void;
  skip?: () => Promise<void> | void;
  maskClosable?: boolean;
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
  store({ opened: true, currentIndex });
}

export async function setTours(tours: Tour[] | Record<number, Tour>, options: Partial<Store> = {}) {
  tourList = Object.assign([], tours);
  const { opened = true, currentIndex = tourList.findIndex((e) => !!e) || 0 } = options;
  if (opened) {
    await openTour(currentIndex);
  } else {
    store({ opened });
  }
}

async function closeTour() {
  store({ opened: false });
  tourList[store.currentIndex].skip?.();
}

async function nextTour() {
  store({ opened: false });
  ContextMenu.close();
  const { currentIndex } = store;
  const isFinish = currentIndex === tourList.length - 1;
  if (isFinish) {
    store({ currentIndex: tourList.findIndex((e) => !!e) || 0 });
  }
  await tourList[currentIndex].finish?.();
  if (!isFinish) {
    openTour(currentIndex + 1);
  }
}

const elementTheme = createDecoratorTheme({ color: '' });

const style = css`
  :host {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 3em;
    aspect-ratio: 1;
    border-radius: 10em;
    color: ${elementTheme.color};
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
`;

@customElement('dy-coach-mark')
@adoptedStyle(style)
@connectStore(store)
@connectStore(locale)
@shadow()
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

  #stopPropagation = (e: Event) => e.stopPropagation();

  #skip = () => {
    ContextMenu.close();
    closeTour();
  };

  #open = async () => {
    if (!this.#tour) return;
    const { description, preview = '', title, finishText, maskClosable } = this.#tour;
    const isFinish = store.currentIndex === tourList.length - 1;
    this.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    if (!this.visible) await new Promise((res) => this.addEventListener('show', res, { once: true }));
    DuoyunWaitElement.instance?.remove(); // avoid inert conflict
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
            <dy-button @click=${() => nextTour()} small>
              ${finishText || (isFinish ? locale.finishTour : locale.nextTour)}
            </dy-button>
          </div>
        </dy-card>
      `,
      {
        maskClosable,
        activeElement: this,
        width: this.#width,
      },
    ).then(() => {
      closeTour();
    });
  };

  @mounted()
  #init = () => {
    addListener(this, 'pointerdown', this.#stopPropagation);
    addListener(this, 'pointerup', this.#stopPropagation);
    addListener(this, 'click', this.#stopPropagation);
  };

  @effect()
  #autoOpen = () => {
    if (!this.#tour) return;
    this.#open();
  };

  @elementTheme()
  #theme = () => ({ color: getSemanticColor(this.color) || this.color || theme.informativeColor });

  render = () => {
    if (!this.#tour) return null;
    return html`
      <span class="ring"></span>
      <span class="ring"></span>
      <span class="ring"></span>
    `;
  };
}
