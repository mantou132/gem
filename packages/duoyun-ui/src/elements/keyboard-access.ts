import { GemElement, html } from '@mantou/gem/lib/element';
import { adoptedStyle, customElement } from '@mantou/gem/lib/decorators';
import { createCSSSheet, css, styleMap } from '@mantou/gem/lib/utils';

import { hotkeys, HotKeyHandles, unlock } from '../lib/hotkeys';
import { isNotNullish } from '../lib/types';

import { Toast } from './toast';

import './paragraph';

const style = createCSSSheet(css`
  :host {
    display: contents;
    font-size: 0.75em;
  }
  .contaner {
    position: fixed;
    z-index: 9999999999999;
    pointer-events: none;
    inset: 0;
    margin: 0;
    line-height: 1;
  }
  .key {
    position: absolute;
    background: yellow;
    border-color: #0002;
    text-transform: uppercase;
  }
`);

type FocusableElement = {
  key: string;
  top: number;
  left: number;
};

type State = {
  active: boolean;
  waiting: boolean;
  keydownHandles: HotKeyHandles;
  deepQuerySelectorAll?: (selector: string) => HTMLElement[];
  focusableElements?: FocusableElement[];
};

/**
 * a,b,b...,y,za,zb...,zy
 */
function getChars(index: number) {
  if (index > 50) return;
  const prefix = index >= 25 ? 'z' : '';
  return prefix + String.fromCharCode(97 + (index % 25));
}

/**
 * @customElement dy-keyboard-access
 */
@customElement('dy-keyboard-access')
@adoptedStyle(style)
export class DuoyunKeyboardAccessElement extends GemElement<State> {
  state: State = {
    active: false,
    waiting: false,
    keydownHandles: {},
  };

  #preventEvent = (evt: Event) => {
    evt.stopPropagation();
    evt.preventDefault();
  };

  #handler = (evt: KeyboardEvent) => {
    hotkeys(this.state.keydownHandles)(evt);
    this.#preventEvent(evt);
  };

  #isInputTarget(evt: Event) {
    const originElement = evt.composedPath()[0] as HTMLElement;
    if (
      originElement.isContentEditable ||
      originElement instanceof HTMLInputElement ||
      originElement instanceof HTMLTextAreaElement
    ) {
      return true;
    }
  }

  #onActive = (evt: KeyboardEvent) => {
    if (this.#isInputTarget(evt)) return;
    const { deepQuerySelectorAll, active } = this.state;
    if (!deepQuerySelectorAll || active) return;

    const eles = deepQuerySelectorAll('>>> :is([tabindex],input,textarea,button,select,area,a[href])');
    if (!eles.length) {
      Toast.open('default', 'Not found focusable element');
      return;
    }

    let index = 0;

    const keydownHandles: HotKeyHandles = {
      onLock: () => this.setState({ waiting: true }),
      onUnlock: () => this.setState({ waiting: false }),
      // eslint-disable-next-line no-console
      onUncapture: () => console.warn('Un Capture!'),
    };

    this.setState({
      active: true,
      waiting: false,
      keydownHandles,
      focusableElements: eles
        .map((element) => {
          const root = element.getRootNode() as ShadowRoot | (Document & { host: undefined });
          const { top, left, right, bottom, width, height } = element.getBoundingClientRect();
          if (
            (element as any).disabeld ||
            element.inert ||
            element.tabIndex < 0 ||
            !width ||
            !height ||
            right < 0 ||
            bottom < 0 ||
            left > innerWidth ||
            top > innerHeight
          ) {
            return;
          }
          // Firefox Bug: https://bugzilla.mozilla.org/show_bug.cgi?id=1750907
          const eleFromLeftTop = root.elementFromPoint(left + 2, top + 2);
          const eleFromRightBottom = root.elementFromPoint(left + width - 2, top + height - 2);
          if (
            eleFromLeftTop !== element &&
            eleFromRightBottom !== element &&
            // https://bugs.chromium.org/p/chromium/issues/detail?id=1188919&q=elementFromPoint&can=2
            eleFromLeftTop !== root.host &&
            eleFromRightBottom !== root.host &&
            // ligth dom
            eleFromLeftTop?.parentElement !== element &&
            eleFromRightBottom?.parentElement !== element
          ) {
            return;
          }

          const key = getChars(index);
          if (!key) return;
          // `a-b`
          keydownHandles[[...key].join('-')] = (evt: KeyboardEvent) => {
            this.setState({ active: false });
            element.focus();
            element.click();
            this.#preventEvent(evt);
          };
          index++;
          return { key, top, left };
        })
        .filter(isNotNullish),
    });
    this.#preventEvent(evt);
  };

  #onInavtive = (evt: KeyboardEvent) => {
    if (!this.state.active) return;
    this.setState({ active: false });
    this.#preventEvent(evt);
  };

  #onCancal = () => {
    if (!this.state.active) return;
    unlock();
    this.setState({ active: false });
  };

  #onKeydown = (evt: KeyboardEvent) => {
    if (this.#isInputTarget(evt)) return;
    hotkeys({
      f: this.#onActive,
      j: () => document.body.scrollBy(0, -innerHeight / 3),
      k: () => document.body.scrollBy(0, innerHeight / 3),
      h: () => document.body.scrollBy(0, -innerHeight),
      l: () => document.body.scrollBy(0, innerHeight),
      esc: this.#onInavtive,
    })(evt);
  };

  mounted = () => {
    this.effect(
      () => {
        if (this.state.active) {
          document.body.style.pointerEvents = 'none';
          addEventListener('keydown', this.#handler, { capture: true });
          return () => {
            document.body.style.pointerEvents = 'auto';
            removeEventListener('keydown', this.#handler, { capture: true });
          };
        }
      },
      () => [this.state.active],
    );
    this.effect(
      async () => {
        const url = 'https://cdn.skypack.dev/deep-query-selector@1.0.1';
        const { deepQuerySelectorAll } = await import(/* @vite-ignore */ /* webpackIgnore: true */ `${url}?min`);
        this.setState({ deepQuerySelectorAll });
      },
      () => [],
    );
    addEventListener('keydown', this.#onKeydown, { capture: true });
    addEventListener('pointerdown', this.#onCancal);
    return () => {
      removeEventListener('keydown', this.#onKeydown, { capture: true });
      removeEventListener('pointerdown', this.#onCancal);
    };
  };

  render = () => {
    const { active, focusableElements, waiting } = this.state;
    if (!active || !focusableElements) return html``;
    return html`
      <dy-paragraph class="contaner">
        ${focusableElements.map(
          ({ key, left, top }) =>
            html`
              <kbd
                class="key"
                style=${styleMap({
                  left: `${left}px`,
                  top: `${top}px`,
                  display: waiting && key.length === 1 ? 'none' : undefined,
                })}
              >
                ${[...key].map((char, index) => (waiting && !index ? '' : html`<span>${char}</span>`))}
              </kbd>
            `,
        )}
      </dy-paragraph>
    `;
  };
}
