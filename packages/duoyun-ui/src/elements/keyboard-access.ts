import { createCSSSheet, GemElement, html } from '@mantou/gem/lib/element';
import {
  adoptedStyle,
  customElement,
  attribute,
  part,
  property,
  emitter,
  Emitter,
  shadow,
} from '@mantou/gem/lib/decorators';
import { addListener, css, styleMap } from '@mantou/gem/lib/utils';
import { logger } from '@mantou/gem/helper/logger';

import { hotkeys, HotKeyHandles, unlock } from '../lib/hotkeys';
import { isNotNullish } from '../lib/types';
import { theme } from '../lib/theme';
import { contentsContainer } from '../lib/styles';
import { closestElement, findActiveElement, isInputElement } from '../lib/element';

import { Toast } from './toast';
import { DuoyunLinkElement } from './link';

import 'deep-query-selector';
import './paragraph';

const getFocusableElements = () => {
  const get = (root: Document | Element) =>
    root
      .deepQuerySelectorAll('>>> :is(input,textarea,button,select,area,summary,audio,video,[tabindex],a[href])')
      .map((element) => {
        // details 内容 Chrome 能检测到尺寸，Bug？
        if (element.checkVisibility && !element.checkVisibility({ checkVisibilityCSS: true, checkOpacity: true })) {
          return;
        }
        if (
          (element as unknown as HTMLOrSVGElement).tabIndex < 0 ||
          (element as any).disabled ||
          (element as GemElement).internals?.ariaDisabled === 'true' ||
          (element as GemElement).internals?.ariaHidden === 'true' ||
          closestElement(element, ':is([inert],[disabled],[aria-disabled=true],[aria-hidden=true])')
        ) {
          return;
        }
        const rect = element.getBoundingClientRect();
        if (!rect.width || !rect.height) {
          return;
        }
        return { rect, element };
      })
      .filter(isNotNullish);

  const elements = get(document);
  return elements.filter(({ element }) => {
    return get(element).length === 0;
  });
};

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
  element: Element;
};

type State = {
  active: boolean;
  waiting: boolean;
  keydownHandles: HotKeyHandles;
  focusableElements?: FocusableElement[];
};

export type NavigationDirection = 'up' | 'down' | 'left' | 'right';

/**
 * @customElement dy-keyboard-access
 * Firefox cross origin open popup allow: about:config -> dom.popup_allowed_events add `keydown`
 */
@customElement('dy-keyboard-access')
@adoptedStyle(style)
@adoptedStyle(contentsContainer)
@shadow()
export class DuoyunKeyboardAccessElement extends GemElement<State> {
  @part static kbd: string;
  @attribute activekey: string;

  @property scrollContainer?: HTMLElement;

  @emitter navigation: Emitter<NavigationDirection>;

  get #activeKey() {
    return this.activekey || 'f';
  }

  get #container() {
    return this.scrollContainer || document.body;
  }

  state: State = {
    active: false,
    waiting: false,
    keydownHandles: {},
  };

  #onActive = () => {
    const focusableElements = getFocusableElements()
      .map(({ rect, element }) => {
        const { top, left, right, bottom, width, height } = rect;
        if (right < 0 || bottom < 0 || left > innerWidth || top > innerHeight) {
          return;
        }
        // https://bugzilla.mozilla.org/show_bug.cgi?id=1750907
        // https://bugs.chromium.org/p/chromium/issues/detail?id=1188919&q=elementFromPoint&can=2
        const root = element.getRootNode() as ShadowRoot | Document;
        const elementsFromLeftTop = root.elementsFromPoint(left + 2, top + 2);
        const elementsFromRightBottom = root.elementsFromPoint(left + width - 2, top + height - 2);
        // `elementsFromPoint` 不包含 SVG a 元素，不知道原因
        const elements = [...elementsFromLeftTop, ...elementsFromRightBottom].map((e) =>
          e instanceof SVGElement ? e.closest('a') : e,
        );
        if (!elements.includes(element)) {
          return;
        }

        return { key: '', top, left, element };
      })
      .filter(isNotNullish)
      .map((e, index) => {
        // a,b,c...,y,za,zb...,zy
        if (index >= 50) return;
        const prefix = index >= 25 ? 'z' : '';
        e.key = prefix + String.fromCharCode(97 + (index % 25));
        return e;
      })
      .filter(isNotNullish);

    if (!focusableElements.length) {
      Toast.open('info', 'Not found focusable element');
      return;
    }

    const keydownHandles: HotKeyHandles = {
      esc: this.#onInactive,
      onLock: () => this.setState({ waiting: true }),
      onUnlock: () => this.setState({ waiting: false }),
      onUncapture: () => logger.warn('Un Capture!'),
    };

    focusableElements.forEach(({ key, element }) => {
      // `a-b`
      keydownHandles[[...key].join('-')] = () => {
        this.setState({ active: false });
        if (element instanceof HTMLElement) {
          // BasePickerElement 的 `showPicker` 一样支持通过 `click` 触发
          element.focus();
          element.click();
        } else if (element instanceof SVGAElement) {
          const link = new DuoyunLinkElement();
          link.href = element.getAttribute('href')!;
          link.click();
        }
      };
    });

    this.setState({
      active: true,
      waiting: false,
      keydownHandles,
      focusableElements,
    });
  };

  #onInactive = () => {
    if (!this.state.active) return;
    this.setState({ active: false });
  };

  #onCancel = () => {
    if (!this.state.active) return;
    unlock();
    this.setState({ active: false });
  };

  #onNavigation = (dir: NavigationDirection) => {
    const activeElement = findActiveElement();
    const focusableElements = getFocusableElements();
    const current = focusableElements.find(({ element }) => activeElement === element);
    const currentRect = current?.rect || {
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
    };
    const elements = focusableElements
      .filter((ele) => {
        return ele !== current;
      })
      .filter(({ rect }) => {
        if (!current) return true;
        switch (dir) {
          case 'down':
            return rect.bottom > currentRect.bottom;
          case 'up':
            return rect.top < currentRect.top;
          case 'right':
            return rect.right > currentRect.right;
          case 'left':
            return rect.left < currentRect.left;
        }
      })
      .sort((a, b) => {
        const getPoint = (rect: typeof currentRect) => [(rect.left + rect.right) / 2, (rect.top + rect.bottom) / 2];
        const originPoint = getPoint(currentRect);
        const getDistance = (rect: typeof currentRect) => {
          const point = getPoint(rect);
          const isHorizontal = dir === 'left' || dir === 'right';
          const weights = [isHorizontal ? 1 : 100, !isHorizontal ? 1 : 100];
          return Math.sqrt(
            (point[0] - originPoint[0]) ** 2 * weights[0] + (point[1] - originPoint[1]) ** 2 * weights[1],
          );
        };
        return getDistance(a.rect) - getDistance(b.rect);
      });

    if (elements.length) {
      (elements[0].element as any).focus?.();
      this.navigation(dir);
    }
  };

  #onKeydown = (evt: KeyboardEvent) => {
    if (this.state.active) return;
    if (isInputElement(evt.composedPath()[0] as HTMLElement)) return;
    hotkeys(
      {
        [this.#activeKey]: this.#onActive,
        j: () => this.#container.scrollBy(0, -innerHeight / 3),
        k: () => this.#container.scrollBy(0, innerHeight / 3),
        h: () => this.#container.scrollBy(0, -innerHeight),
        l: () => this.#container.scrollBy(0, innerHeight),
        down: () => this.#onNavigation('down'),
        up: () => this.#onNavigation('up'),
        left: () => this.#onNavigation('left'),
        right: () => this.#onNavigation('right'),
      },
      { stopPropagation: true },
    )(evt);
  };

  mounted = () => {
    this.effect(
      () => {
        if (this.state.active) {
          document.body.style.pointerEvents = 'none';
          const removeListener = addListener(
            window,
            'keydown',
            hotkeys(this.state.keydownHandles, { stopPropagation: true }),
            { capture: true },
          );
          return () => {
            document.body.style.pointerEvents = 'auto';
            removeListener();
          };
        }
      },
      () => [this.state.active],
    );
    const removeKeydownListener = addListener(window, 'keydown', this.#onKeydown, { capture: true });
    const removePointerdown = addListener(window, 'pointerdown', this.#onCancel);
    return () => {
      removeKeydownListener();
      removePointerdown();
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
