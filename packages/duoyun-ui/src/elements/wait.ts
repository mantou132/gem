import { adoptedStyle, aria, customElement, state } from '@mantou/gem/lib/decorators';
import { GemElement, html } from '@mantou/gem/lib/element';
import { createCSSSheet, css } from '@mantou/gem/lib/utils';

import { sleep } from '../lib/timer';
import { setBodyInert } from '../lib/element';
import { theme } from '../lib/theme';
import { commonAnimationOptions, fadeIn, fadeOut } from '../lib/animations';

import './loading';

const style = createCSSSheet(css`
  :host(:where(:not([hidden]))) {
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
    pointer-events: none;
  }
  dy-loading {
    padding: 1em;
  }
  :host(:state(modal)) {
    pointer-events: all;
    background-color: rgba(0, 0, 0, ${theme.maskAlpha});
  }
`);

interface WaitOptions {
  minDelay?: number;
}

let totalPromise: Promise<any> = Promise.resolve();

export async function waitLoading<T>(promise: Promise<T> | T, options: WaitOptions & Partial<State> = {}): Promise<T> {
  const { minDelay = 500 } = options;
  const isLongPromise = Symbol();
  const r = await Promise.any<typeof isLongPromise | T>([sleep(16).then(() => isLongPromise), promise]);
  if (r === isLongPromise) {
    let animate: Promise<any> = Promise.resolve();
    if (!DuoyunWaitElement.instance) {
      const ele = new DuoyunWaitElement(options);
      document.documentElement.append(ele);
      animate = ele.animate(fadeIn, commonAnimationOptions).finished;
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

export const changeLoading = (newState: Partial<State>) => {
  DuoyunWaitElement.instance?.setState(newState);
};

type Position = 'start' | 'center' | 'end';

type State = {
  text?: string;
  transparent?: boolean;
  color?: string;
  position?: Position | `${Position} ${Position}`;
};

/**
 * @customElement dy-wait
 */
@customElement('dy-wait')
@adoptedStyle(style)
@aria({ role: 'alert', ariaBusy: 'true' })
export class DuoyunWaitElement extends GemElement<State> {
  static instance?: DuoyunWaitElement;
  static wait = waitLoading;
  static close = closeLoading;
  static change = changeLoading;

  @state modal: boolean;

  constructor(initState: State = {}) {
    super();
    this.state = initState;
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

  #removedResolve?: (_?: unknown) => void;
  unmounted = () => {
    DuoyunWaitElement.instance = undefined;
    this.#removedResolve?.();
  };

  render = () => {
    const { text, transparent, position, color } = this.state;
    this.internals.ariaLabel = text || '';
    this.modal = !transparent;

    const [align, justify] = position?.split(' ') || [];

    return html`
      <style>
        :host {
          color: ${color || 'white'};
          align-items: ${align || 'flex-start'};
          justify-content: ${justify || 'center'};
          padding-bottom: ${align === 'center' ? '10vh' : 0};
        }
      </style>
      <dy-loading>${text}</dy-loading>
    `;
  };

  // 多个 promise 可能共享同一个 wait 元素，只能通过实例来判断是否结束
  // 和其他 modal 元素一起使用时需通过 instance 来判断，避免 inert 设置错误
  removed = new Promise((res) => (this.#removedResolve = res));
}
