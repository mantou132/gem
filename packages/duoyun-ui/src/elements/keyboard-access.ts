import { GemElement, html } from '@mantou/gem/lib/element';
import { adoptedStyle, customElement, attribute, part } from '@mantou/gem/lib/decorators';
import { createCSSSheet, css, styleMap } from '@mantou/gem/lib/utils';
import { logger } from '@mantou/gem/helper/logger';

import { hotkeys, HotKeyHandles, unlock } from '../lib/hotkeys';
import { isNotNullish } from '../lib/types';
import { theme } from '../lib/theme';
import { contentsContainer } from '../lib/styles';

import { Toast } from './toast';

import 'deep-query-selector';
import './paragraph';

const style = createCSSSheet(css`
  :host {
    font-size: 0.75em;
  }
  .container {
    position: fixed;
    z-index: calc(${theme.popupZIndex} + 3);
    pointer-events: none;
    inset: 0;
    margin: 0;
    line-height: 1;
  }
  .key {
    position: absolute;
    background: yellow;
    color: black;
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
 * Firefox cross origin open popup allow: about:config -> dom.popup_allowed_events add `keydown`
 */
@customElement('dy-keyboard-access')
@adoptedStyle(style)
@adoptedStyle(contentsContainer)
export class DuoyunKeyboardAccessElement extends GemElement<State> {
  @part static kbd: string;
  @attribute activekey: string;

  get #activeKey() {
    return this.activekey || 'f';
  }

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
    const { active } = this.state;
    if (active) return;

    const elements = document.deepQuerySelectorAll(
      '>>> :is([tabindex],input,textarea,button,select,area,a[href])',
    ) as HTMLElement[];
    if (!elements.length) {
      Toast.open('default', 'Not found focusable element');
      return;
    }

    let index = 0;

    const keydownHandles: HotKeyHandles = {
      onLock: () => this.setState({ waiting: true }),
      onUnlock: () => this.setState({ waiting: false }),
      onUncapture: () => logger.warn('Un Capture!'),
    };

    this.setState({
      active: true,
      waiting: false,
      keydownHandles,
      focusableElements: elements
        .map((element) => {
          const { top, left, right, bottom, width, height } = element.getBoundingClientRect();
          if (
            (element as any).disabled ||
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
          // https://bugzilla.mozilla.org/show_bug.cgi?id=1750907
          // https://bugs.chromium.org/p/chromium/issues/detail?id=1188919&q=elementFromPoint&can=2
          const root = element.getRootNode() as ShadowRoot | (Document & { host: undefined });
          const elementsFromLeftTop = root.elementsFromPoint(left + 2, top + 2);
          const elementsFromRightBottom = root.elementsFromPoint(left + width - 2, top + height - 2);
          if (!elementsFromLeftTop.includes(element) && !elementsFromRightBottom.includes(element)) {
            return;
          }

          const key = getChars(index);
          if (!key) return;
          // `a-b`
          keydownHandles[[...key].join('-')] = (evt: KeyboardEvent) => {
            this.setState({ active: false });
            if ('showPicker' in element) {
              (element as HTMLInputElement).showPicker();
            } else {
              element.focus();
              element.click();
            }
            this.#preventEvent(evt);
          };
          index++;
          return { key, top, left };
        })
        .filter(isNotNullish),
    });
    this.#preventEvent(evt);
  };

  #onInactive = (evt: KeyboardEvent) => {
    if (!this.state.active) return;
    this.setState({ active: false });
    this.#preventEvent(evt);
  };

  #onCancel = () => {
    if (!this.state.active) return;
    unlock();
    this.setState({ active: false });
  };

  #onKeydown = (evt: KeyboardEvent) => {
    if (this.#isInputTarget(evt)) return;
    hotkeys({
      [this.#activeKey]: this.#onActive,
      j: () => document.body.scrollBy(0, -innerHeight / 3),
      k: () => document.body.scrollBy(0, innerHeight / 3),
      h: () => document.body.scrollBy(0, -innerHeight),
      l: () => document.body.scrollBy(0, innerHeight),
      esc: this.#onInactive,
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
    addEventListener('keydown', this.#onKeydown, { capture: true });
    addEventListener('pointerdown', this.#onCancel);
    return () => {
      removeEventListener('keydown', this.#onKeydown, { capture: true });
      removeEventListener('pointerdown', this.#onCancel);
    };
  };

  render = () => {
    const { active, focusableElements, waiting } = this.state;
    if (!active || !focusableElements) return html``;
    return html`
      <dy-paragraph class="container">
        ${focusableElements.map(
          ({ key, left, top }) => html`
            <kbd
              part=${DuoyunKeyboardAccessElement.kbd}
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
