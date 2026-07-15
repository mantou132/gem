import type { Emitter } from '@mantou/gem/lib/decorators';
import {
  adoptedStyle,
  aria,
  boolattribute,
  customElement,
  emitter,
  property,
  template,
} from '@mantou/gem/lib/decorators';
import { css, GemElement, html } from '@mantou/gem/lib/element';
import { classMap } from '@mantou/gem/lib/utils';

import { theme } from '../lib/theme';

import './badge';
import './use';

export type TabbarItem = {
  label: string;
  value?: string | number;
  icon?: string | Element | DocumentFragment;
  /**Icon when selected; falls back to `icon` */
  activeIcon?: string | Element | DocumentFragment;
  /**Badge count / text; `true` for a dot */
  badge?: string | number | boolean;
  disabled?: boolean;
};

const style = css`
  :scope:where(:not([hidden])) {
    display: flex;
    align-items: stretch;
    justify-content: space-around;
    width: 100%;
    box-sizing: border-box;
    padding-block: 0.4em;
    padding-block-end: calc(0.4em + env(safe-area-inset-bottom, 0px));
    background: ${theme.backgroundColor};
    border-block-start: 1px solid ${theme.borderColor};
    color: ${theme.describeColor};
    -webkit-tap-highlight-color: transparent;
    user-select: none;
  }
  :scope[fixed] {
    position: fixed;
    inset-inline: 0;
    inset-block-end: 0;
    z-index: 100;
  }
  .item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.2em;
    min-width: 0;
    padding: 0.2em 0.4em;
    border: none;
    background: transparent;
    color: inherit;
    font: inherit;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  .item:disabled {
    cursor: not-allowed;
    opacity: 0.35;
  }
  .item.current {
    color: ${theme.primaryColor};
  }
  .icon-wrap {
    display: flex;
    position: relative;
    line-height: 0;
  }
  .icon {
    width: 1.5em;
    height: 1.5em;
  }
  .label {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 0.625em;
    line-height: 1.3;
  }
`;

@customElement('tap-tabbar')
@adoptedStyle(style)
@aria({ role: 'tablist' })
export class TapTabbarElement extends GemElement {
  /**Pin to the bottom of the viewport */
  @boolattribute fixed: boolean;

  @property items?: TabbarItem[];
  @property value?: string | number;
  @emitter change: Emitter<string | number>;

  #itemValue = (item: TabbarItem, index: number) => item.value ?? index;

  #renderIcon = (item: TabbarItem, current: boolean) => {
    const icon = (current && item.activeIcon) || item.icon;
    if (!icon) return '';
    const iconEl = html`<tap-use class="icon" .element=${icon}></tap-use>`;
    if (item.badge === undefined || item.badge === false) {
      return html`<span class="icon-wrap">${iconEl}</span>`;
    }
    const isDot = item.badge === true;
    return html`
      <span class="icon-wrap">
        <tap-badge ?dot=${isDot} count=${isDot ? '' : String(item.badge)} small>${iconEl}</tap-badge>
      </span>
    `;
  };

  @template()
  #content = () => {
    return html`
      ${(this.items || []).map((item, index) => {
        const value = this.#itemValue(item, index);
        const current = value === this.value;
        return html`
          <button
            type="button"
            role="tab"
            class=${classMap({ item: true, current })}
            aria-selected=${current}
            ?disabled=${!!item.disabled}
            @click=${() => !item.disabled && this.change(value)}
          >
            ${this.#renderIcon(item, current)}
            <span class="label">${item.label}</span>
          </button>
        `;
      })}
    `;
  };
}
