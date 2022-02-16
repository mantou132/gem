import { adoptedStyle, customElement, property } from '@mantou/gem/lib/decorators';
import { GemElement, html, TemplateResult } from '@mantou/gem/lib/element';
import { createCSSSheet, css, classMap, isArrayChange } from '@mantou/gem/lib/utils';

import { icons } from '../lib/icons';
import { theme } from '../lib/theme';

import './use';

const style = createCSSSheet(css`
  :host {
    z-index: ${theme.popupZIndex};
    position: fixed;
    display: flex;
    align-items: center;
    flex-direction: column;
    gap: 1em;
    top: calc(1em + env(titlebar-area-height, 0px));
    left: 50%;
    transform: translateX(-50%);
    max-width: 90%;
    font-size: 0.875em;
  }
  .item {
    display: flex;
    align-items: center;
    gap: 0.5em;
    color: white;
    background: ${theme.informativeColor};
    border-radius: ${theme.normalRound};
    padding: 0.6em 0.8em;
    line-height: 1;
    max-width: 100%;
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
    width: 1.2em;
  }
  .body {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .body::first-letter {
    text-transform: capitalize;
  }
`);

type Type = 'success' | 'warning' | 'error' | 'default';

interface Item {
  type: Type;
  content: string | TemplateResult;
}

const itemMap = new Map<Item, number>();

interface Option {
  duration?: number;
  debug?: boolean;
}

/**
 * @customElement dy-toast
 */
@customElement('dy-toast')
@adoptedStyle(style)
export class DuoyunToastElement extends GemElement {
  @property data?: Item[];

  static instance?: DuoyunToastElement;

  static open(type: Type, content: string | TemplateResult, { debug, duration = 3000 }: Option = {}) {
    const toast = Toast.instance || new Toast();
    const item = toast.data?.find((e) => {
      if (e.type !== type) return false;
      // support simple `TemplateResult`
      return typeof e.content === 'string' || typeof content === 'string'
        ? e.content === content
        : !isArrayChange(content.values as any[], e.content.values as any[]);
    }) || { type, content };
    clearTimeout(itemMap.get(item));
    toast.data = [...(toast.data || []).filter((e) => e !== item), item];
    itemMap.set(
      item,
      window.setTimeout(
        async () => {
          await toast.#over;
          if (!toast.data) return;
          itemMap.delete(item);
          toast.data = toast.data.filter((e) => e !== item);
          if (toast.data.length === 0) toast.remove();
        },
        debug ? 1000000 : duration,
      ),
    );
  }

  constructor() {
    super();
    this.internals.role = 'alert';
    this.internals.ariaLive = 'polite';
    if (Toast.instance) throw new Error('Single instance component');
    document.body.append(this);
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
        return icons.success;
      case 'warning':
        return icons.warning;
      case 'error':
        return icons.error;
      default:
        return icons.info;
    }
  };

  mounted = () => {
    Toast.instance = this;
    return () => (Toast.instance = undefined);
  };

  render = () => {
    return html`
      ${this.data?.map(
        ({ type, content }) => html`
          <div class=${classMap({ item: true, [type]: true })}>
            <dy-use class="icon" .element=${this.#getIcon(type)}></dy-use>
            <span class="body">${content}</span>
          </div>
        `,
      )}
    `;
  };
}

export const Toast = DuoyunToastElement;
