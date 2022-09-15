import { adoptedStyle, customElement } from '@mantou/gem/lib/decorators';
import { GemElement, html } from '@mantou/gem/lib/element';
import { createCSSSheet, css } from '@mantou/gem/lib/utils';

import { sleep, setBodyInert } from '../lib/utils';
import { theme } from '../lib/theme';
import { commonAnimationOptions, fadeIn, fadeOut } from '../lib/animations';

import './loading';

const style = createCSSSheet(css`
  :host {
    position: fixed;
    z-index: ${theme.popupZIndex};
    display: flex;
    width: 100%;
    height: 100%;
    left: 0;
    top: env(titlebar-area-height, var(--titlebar-area-height, 0px));
    color: white;
    background-color: rgba(0, 0, 0, ${theme.maskAlpha});
    justify-content: center;
    padding-top: 1em;
    align-items: flex-start;
  }
`);

interface Option {
  minDelay?: number;
  text?: string;
}

export async function waitLoading<T>(promise: Promise<T>, { minDelay = 500, text }: Option = {}): Promise<T> {
  let ele: DuoyunWaitElement | undefined = undefined;
  try {
    const token = Symbol();
    const r = await Promise.any<symbol | T>([sleep(16).then(() => token), promise]);
    if (r === token) {
      ele = new DuoyunWaitElement(text);
      const [result] = await Promise.all([
        promise,
        sleep(minDelay),
        ele.animate(fadeIn, commonAnimationOptions).finished,
      ]);
      return result;
    } else {
      return r as T;
    }
  } finally {
    if (ele) {
      await ele.animate(fadeOut, commonAnimationOptions).finished;
      ele?.remove();
    }
  }
}

/**
 * @customElement dy-wait
 */
@customElement('dy-wait')
@adoptedStyle(style)
export class DuoyunWaitElement extends GemElement {
  static instance?: DuoyunWaitElement;

  static wait = waitLoading;

  constructor(text = '') {
    super();
    this.#text = text;
    this.internals.role = 'alert';
    this.internals.ariaBusy = 'true';
    this.internals.ariaLabel = this.#text;
    document.documentElement.append(this);
    this.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  #text = '';

  mounted = () => {
    DuoyunWaitElement.instance?.remove();
    DuoyunWaitElement.instance = this;
    const restoreInert = setBodyInert(this);
    return () => {
      restoreInert();
      DuoyunWaitElement.instance = undefined;
    };
  };

  render = () => {
    return html`<dy-loading>${this.#text}</dy-loading>`;
  };
}
