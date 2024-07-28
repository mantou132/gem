import { adoptedStyle, aria, customElement, property, shadow } from '@mantou/gem/lib/decorators';
import { GemElement, html, TemplateResult, createCSSSheet } from '@mantou/gem/lib/element';
import { css, classMap } from '@mantou/gem/lib/utils';
import { repeat } from '@mantou/gem/lib/directives';

import { icons } from '../lib/icons';
import { theme } from '../lib/theme';
import { getStringFromTemplate } from '../lib/utils';

import './use';
import './action-text';

const style = createCSSSheet(css`
  :host(:where(:not([hidden]))) {
    --item-gap: 1em;
    --item-padding-block: 0.6em;
    --item-icon-height: 1.2em;
    --item-height: calc(var(--item-gap) + var(--item-icon-height) + 2 * var(--item-padding-block));
    z-index: ${theme.popupZIndex};
    position: fixed;
    display: flex;
    align-items: center;
    flex-direction: column;
    gap: var(--item-gap);
    top: calc(var(--item-gap) + env(titlebar-area-height, var(--titlebar-area-height, 0px)));
    left: 50%;
    transform: translateX(-50%);
    max-width: 90%;
    font-size: 0.875em;
  }
  .item {
    z-index: 1;
    display: flex;
    align-items: center;
    gap: 0.5em;
    color: white;
    background: ${theme.informativeColor};
    border-radius: ${theme.normalRound};
    padding: var(--item-padding-block) 0.8em;
    line-height: 1;
    max-width: 100%;
    animation-composition: replace;
    animation-fill-mode: forwards;
    animation-timing-function: ${theme.timingFunction};
    animation-duration: 300ms;
    animation-name: show;
  }
  .item.removed {
    z-index: 0;
    animation-name: hide;
  }
  @keyframes show {
    from {
      margin-block-start: calc(0px - var(--item-height));
      opacity: 0;
    }
  }
  @keyframes hide {
    to {
      margin-block-start: calc(0px - var(--item-height));
      opacity: 0;
    }
  }
  .success {
    background: ${theme.positiveColor};
  }
  .warning {
    background: ${theme.noticeColor};
  }
  .error {
    background: ${theme.negativeColor};
  }
  .icon {
    flex-shrink: 0;
    width: var(--item-icon-height);
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
    cursor: pointer;
    text-decoration: underline;
  }
`);

type Type = 'info' | 'success' | 'warning' | 'error' | 'loading';

type ToastItem = {
  key: string;
  type: Type;
  content: string | TemplateResult;
  action?: { text: string; handle: () => void };
};

type ToastOptions = Partial<ToastItem> & {
  duration?: number;
  debug?: boolean;
};

const itemTimerMap = new WeakMap<ToastItem, number>();
const removedSet = new WeakSet<ToastItem>();

/**
 * @customElement dy-toast
 */
@customElement('dy-toast')
@adoptedStyle(style)
@aria({ role: 'alert', ariaLive: 'polite' })
@shadow()
export class DuoyunToastElement extends GemElement {
  @property items?: ToastItem[];

  static instance?: DuoyunToastElement;

  static open(options: ToastOptions): void;
  static open(type: Type, content: string | TemplateResult): void;
  static open(arg1: Type | ToastOptions, arg2?: string | TemplateResult) {
    const {
      action,
      type = 'info',
      content = '',
      debug = false,
      duration = action ? 5000 : 3000,
      key = type + getStringFromTemplate(content),
    } = typeof arg1 === 'string' ? ({ type: arg1, content: arg2 } as ToastOptions) : arg1;
    const toast = Toast.instance || new Toast();
    if (!toast.isConnected) document.body.append(toast);
    const item = toast.items?.find((e) => e.key === key) || { key, type, content, action };
    // 如果 item 正在执行删除动画，这里会导致一点小瑕疵
    toast.items = [...(toast.items || []).filter((e) => e !== item), item];
    // 取消正在执行移除动画的删除定时器
    removedSet.delete(item);
    clearTimeout(itemTimerMap.get(item));
    const removeTimer = window.setTimeout(() => toast.#removeItem(item), debug ? 1000000 : duration);
    itemTimerMap.set(item, removeTimer);
  }

  constructor() {
    super();
    if (Toast.instance) throw new Error('Single instance component');
    this.addEventListener('mouseover', () => {
      this.#over = new Promise((res) => {
        this.addEventListener('mouseout', () => res(), { once: true });
      });
    });
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
    window.setTimeout(() => {
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

  mounted = () => {
    Toast.instance = this;
    return () => (Toast.instance = undefined);
  };

  render = () => {
    return html`
      ${repeat(
        this.items || [],
        (item) => item.key,
        (item) => html`
          <div class=${classMap({ item: true, [item.type]: true, removed: removedSet.has(item) })}>
            <dy-use class="icon" .element=${this.#getIcon(item.type)}></dy-use>
            <span class="body">${item.content}</span>
            ${item.action
              ? html`
                  <dy-action-text class="action" color="white" @click=${() => this.#clickAction(item)}>
                    ${item.action.text}
                  </dy-action-text>
                `
              : ''}
          </div>
        `,
      )}
    `;
  };
}

export const Toast = DuoyunToastElement;
