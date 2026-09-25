import { mediaQuery } from '@mantou/gem/helper/mediaquery';
import { adoptedStyle, aria, customElement, mounted, part, property, shadow } from '@mantou/gem/lib/decorators';
import type { TemplateResult } from '@mantou/gem/lib/element';
import { css, GemElement, html, repeat } from '@mantou/gem/lib/element';
import { addListener, classMap } from '@mantou/gem/lib/utils';

import { commonHandle } from '../lib/hotkeys';
import { icons } from '../lib/icons';
import { focusStyle } from '../lib/styles';
import { theme } from '../lib/theme';
import { getStringFromTemplate } from '../lib/utils';

import './use';

const style = css`
  :host(:where(:not([hidden]))) {
    z-index: ${theme.popupZIndex};
    position: fixed;
    display: flex;
    align-items: center;
    flex-direction: column;
    gap: 0.8em;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    max-width: 80%;
    pointer-events: none;
  }
  .item {
    z-index: 1;
    display: flex;
    align-items: center;
    gap: 0.5em;
    color: white;
    background: rgba(0, 0, 0, 0.75);
    border-radius: calc(${theme.normalRound} * 2);
    padding: 0.8em 1.2em;
    line-height: 1.4;
    max-width: 100%;
    box-sizing: border-box;
    animation-composition: replace;
    animation-fill-mode: forwards;
    animation-timing-function: ${theme.timingFunction};
    animation-duration: 300ms;
    animation-name: tap-toast-show;
  }
  .item.removed {
    z-index: 0;
    animation-name: tap-toast-hide;
  }
  @keyframes tap-toast-show {
    from {
      opacity: 0;
      transform: scale(0.8);
    }
  }
  @keyframes tap-toast-hide {
    to {
      opacity: 0;
      transform: scale(0.8);
    }
  }
  .icon {
    flex-shrink: 0;
    width: 1.4em;
  }
  .body {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .body:empty {
    display: none;
  }
  .body::first-letter {
    text-transform: capitalize;
  }
  .action {
    font: inherit;
    color: inherit;
    background: transparent;
    border: none;
    padding: 0;
    cursor: pointer;
    text-decoration: underline;
  }
`;

export type Type = 'info' | 'success' | 'warning' | 'error' | 'loading';

export type ToastItem = {
  key: string;
  type: Type;
  content: string | TemplateResult;
  // duoyun-ui only
  action?: { text: string; handle: () => void };
};

export type ToastOptions = Partial<ToastItem> & {
  duration?: number;
  debug?: boolean;
};

const itemTimerMap = new WeakMap<ToastItem, ReturnType<typeof setTimeout>>();
const removedSet = new WeakSet<ToastItem>();

@customElement('tap-toast')
@adoptedStyle(style)
@adoptedStyle(focusStyle)
@aria({ role: 'alert', ariaLive: 'polite' })
@shadow()
export class TapToastElement extends GemElement {
  @part static item: string;
  @part static icon: string;
  @part static body: string;
  @part static action: string;

  @property items?: ToastItem[];

  static instance?: TapToastElement;

  static open(options: ToastOptions): void;
  static open(type: Type, content: string | TemplateResult): void;
  static open(arg1: Type | ToastOptions, arg2?: string | TemplateResult) {
    const {
      action,
      type = 'info',
      content = '',
      debug = false,
      duration = action ? 5000 : mediaQuery.isDesktop ? 3000 : 1500,
      key = type + getStringFromTemplate(content),
    } = typeof arg1 === 'string' ? ({ type: arg1, content: arg2 } as ToastOptions) : arg1;
    const toast = TapToastElement.instance || new this();
    if (!toast.isConnected) document.body.append(toast);
    const item = toast.items?.find((e) => e.key === key) || { key, type, content, action };
    // 如果 item 正在执行删除动画，这里会导致一点小瑕疵
    toast.items = [...(toast.items || []).filter((e) => e !== item), item];
    // 取消正在执行移除动画的删除定时器
    removedSet.delete(item);
    clearTimeout(itemTimerMap.get(item));
    const removeTimer = setTimeout(() => toast.#removeItem(item), debug ? 1000000 : duration);
    itemTimerMap.set(item, removeTimer);
  }

  #over = Promise.resolve();

  #getIcon = (type: Type) => {
    switch (type) {
      case 'success':
      case 'info':
      case 'warning':
      case 'error':
      case 'loading':
        return icons[type];
      default:
        return Reflect.get(icons, type);
    }
  };

  #removeItem = async (item: ToastItem) => {
    await this.#over;
    removedSet.add(item);
    this.update();
    setTimeout(() => {
      if (!this.items || !removedSet.has(item)) return;
      this.items = this.items.filter((e) => e !== item);
      if (this.items.length === 0) this.remove();
    }, 300);
  };

  #clickAction = (item: ToastItem) => {
    item.action?.handle();
    this.#over = Promise.resolve();
    this.#removeItem(item);
  };

  #onMouseOver = () => {
    this.#over = new Promise((res) => {
      this.addEventListener('mouseout', () => res(), { once: true });
    });
  };

  @mounted()
  #init = () => {
    if (TapToastElement.instance) throw new Error('Single instance component');
    addListener(this, 'mouseover', this.#onMouseOver);
    TapToastElement.instance = this;
    return () => (TapToastElement.instance = undefined);
  };

  render = () => {
    return html`
      ${repeat(
        this.items || [],
        (item) => item.key,
        (item) => html`
          <div
            part=${TapToastElement.item}
            class=${classMap({ item: true, [item.type]: true, removed: removedSet.has(item) })}
          >
            <tap-use part=${TapToastElement.icon} class="icon" .element=${this.#getIcon(item.type)}></tap-use>
            <span part=${TapToastElement.body} class="body">${item.content}</span>
            <button
              v-if=${!!item.action}
              part=${TapToastElement.action}
              class="action"
              @keydown=${commonHandle}
              @click=${() => this.#clickAction(item)}
            >
              ${item.action?.text}
            </button>
          </div>
        `,
      )}
    `;
  };
}

export const Toast = TapToastElement;
