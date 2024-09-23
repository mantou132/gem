import { adoptedStyle, aria, customElement, effect, mounted, shadow, state } from '@mantou/gem/lib/decorators';
import { GemElement, html, createCSSSheet, createState } from '@mantou/gem/lib/element';
import { addListener, css } from '@mantou/gem/lib/utils';
import { createDecoratorTheme } from '@mantou/gem/helper/theme';

import { sleep } from '../lib/timer';
import { setBodyInert } from '../lib/element';
import { theme } from '../lib/theme';
import { commonAnimationOptions, fadeIn, fadeOut } from '../lib/animations';

import './loading';

const elementTheme = createDecoratorTheme({ color: '', align: '', justify: '', paddingBottom: '' });

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
    color: ${elementTheme.color};
    align-items: ${elementTheme.align};
    justify-content: ${elementTheme.justify};
    padding-bottom: ${elementTheme.paddingBottom};
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
  DuoyunWaitElement.instance?.state(newState);
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
@shadow()
export class DuoyunWaitElement extends GemElement {
  static instance?: DuoyunWaitElement;
  static wait = waitLoading;
  static close = closeLoading;
  static change = changeLoading;

  @state modal: boolean;

  constructor(initState: State = {}) {
    super();
    this.state = createState(initState);
  }

  #removedResolve?: (_?: unknown) => void;

  @mounted()
  #init = () => {
    DuoyunWaitElement.instance = this;
    const removeHandle = addListener(this, 'contextmenu', (e) => e.preventDefault());
    return () => {
      DuoyunWaitElement.instance = undefined;
      this.#removedResolve?.();
      removeHandle();
    };
  };

  @effect((i) => [i.state.transparent])
  #updateInert = () => {
    if (!this.state.transparent) {
      const restoreInert = setBodyInert(this);
      return restoreInert;
    }
  };

  @elementTheme()
  #theme = () => {
    const { position, color } = this.state;
    const [align, justify] = position?.split(' ') || [];
    return {
      color: color || 'white',
      align: align || 'flex-start',
      justify: justify || 'center',
      paddingBottom: align === 'center' ? '10vh' : '0',
    };
  };

  render = () => {
    const { text, transparent } = this.state;
    this.internals.ariaLabel = text || '';
    this.modal = !transparent;

    return html`<dy-loading>${text}</dy-loading>`;
  };

  state: ReturnType<typeof createState<State>>;

  // 多个 promise 可能共享同一个 wait 元素，只能通过实例来判断是否结束
  // 和其他 modal 元素一起使用时需通过 instance 来判断，避免 inert 设置错误
  removed = new Promise((res) => (this.#removedResolve = res));
}
