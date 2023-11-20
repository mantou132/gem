import { adoptedStyle, customElement, state } from '@mantou/gem/lib/decorators';
import { GemElement, html } from '@mantou/gem/lib/element';
import { createCSSSheet, css } from '@mantou/gem/lib/utils';

import { sleep, setBodyInert } from '../lib/utils';
import { theme } from '../lib/theme';
import { commonAnimationOptions, fadeIn, fadeOut } from '../lib/animations';

import './loading';

const style = createCSSSheet(css`
  :host {
    view-transition-name: dy-wait;
    position: fixed;
    z-index: ${theme.popupZIndex};
    display: flex;
    left: 0;
    --top: env(titlebar-area-height, var(--titlebar-area-height, 0px));
    top: var(--top);
    width: 100%;
    height: calc(100% - var(--top));
    box-sizing: border-box;
    color: white;
    justify-content: center;
    pointer-events: none;
  }
  dy-loading {
    padding: 1em;
  }
  :host(:where(:--modal, :state(modal))) {
    pointer-events: all;
    background-color: rgba(0, 0, 0, ${theme.maskAlpha});
  }
`);

interface Option {
  minDelay?: number;
}

let totalPromise: Promise<any> = Promise.resolve();

export async function waitLoading<T>(promise: Promise<T>, options: Option & Partial<State> = {}): Promise<T> {
  const { minDelay = 500 } = options;
  const isLongPromise = Symbol();
  const r = await Promise.any<typeof isLongPromise | T>([sleep(16).then(() => isLongPromise), promise]);
  if (r === isLongPromise) {
    let animate: Promise<any> = Promise.resolve();
    if (!DuoyunWaitElement.instance) {
      animate = new DuoyunWaitElement(options).animate(fadeIn, commonAnimationOptions).finished;
    } else {
      changeLoading(options);
    }
    const currentPromise = Promise.all([promise, sleep(minDelay), animate]);

    totalPromise = Promise.allSettled([totalPromise, currentPromise]);
    const temp = totalPromise;

    // is latest loader
    totalPromise.finally(() => {
      if (temp === totalPromise) {
        DuoyunWaitElement.close();
      }
    });

    const [result] = await currentPromise;

    return result;
  } else {
    return r;
  }
}

export const closeLoading = async () => {
  await DuoyunWaitElement.instance?.animate(fadeOut, commonAnimationOptions).finished;
  DuoyunWaitElement.instance?.remove();
};

export const changeLoading = (state: Partial<State>) => {
  DuoyunWaitElement.instance?.setState(state);
};

type State = {
  text?: string;
  transparent?: boolean;
  position?: 'start' | 'center' | 'end';
};

/**
 * @customElement dy-wait
 */
@customElement('dy-wait')
@adoptedStyle(style)
export class DuoyunWaitElement extends GemElement<State> {
  static instance?: DuoyunWaitElement;
  static wait = waitLoading;
  static close = closeLoading;
  static change = changeLoading;

  @state modal: boolean;

  constructor(state: State) {
    super();
    this.state = state;
    this.internals.role = 'alert';
    this.internals.ariaBusy = 'true';
    document.documentElement.append(this);
    this.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  state: State = {};

  mounted = () => {
    DuoyunWaitElement.instance = this;
    this.effect(
      () => {
        if (!this.state.transparent) {
          const restoreInert = setBodyInert(this);
          return restoreInert;
        }
      },
      () => [this.state.transparent],
    );
  };

  unmounted = () => {
    DuoyunWaitElement.instance = undefined;
  };

  render = () => {
    const { text, transparent, position } = this.state;
    this.internals.ariaLabel = text || '';
    this.modal = !transparent;

    return html`
      <style>
        :host {
          align-items: ${this.state.position || 'flex-start'};
          padding-bottom: ${position === 'center' ? '10vh' : 0};
        }
      </style>
      <dy-loading>${this.state.text}</dy-loading>
    `;
  };
}
