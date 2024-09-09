import type { Emitter } from '@mantou/gem/lib/decorators';
import {
  connectStore,
  adoptedStyle,
  customElement,
  attribute,
  emitter,
  property,
  numattribute,
  shadow,
  aria,
} from '@mantou/gem/lib/decorators';
import { GemElement, html, createCSSSheet } from '@mantou/gem/lib/element';
import { css, classMap } from '@mantou/gem/lib/utils';
import { splice } from '@mantou/gem/helper/i18n';
import { useDecoratorTheme } from '@mantou/gem/helper/theme';

import { locale } from '../lib/locale';
import { theme } from '../lib/theme';
import { icons } from '../lib/icons';
import { commonHandle } from '../lib/hotkeys';
import { focusStyle } from '../lib/styles';
import { middle } from '../lib/number';

import { Popover } from './popover';

import './use';
import './input';
import './button';
import './picker';

const [elementTheme, updateTheme] = useDecoratorTheme({ align: '' });

const style = createCSSSheet(css`
  :host(:where(:not([hidden]))) {
    display: flex;
    align-items: center;
    font-size: 0.875em;
    gap: 0.4em;
    font-variant-numeric: tabular-nums;
    justify-content: ${elementTheme.align};
  }
  .item {
    display: flex;
    place-content: center;
    place-items: center;
    min-width: 1em;
    line-height: 1;
    cursor: default;
    text-align: center;
    padding: 0.4em;
    border-radius: ${theme.normalRound};
    border: 1px solid transparent;
  }
  .item:where(:not(.disabled, .current)):hover,
  .item:where(:state(active)) {
    color: ${theme.highlightColor};
    background-color: ${theme.hoverBackgroundColor};
  }
  .item.more {
    color: ${theme.describeColor};
  }
  .item.disabled {
    cursor: not-allowed;
    color: ${theme.describeColor};
    opacity: 0.7;
  }
  .item.current {
    color: ${theme.primaryColor};
    border-color: currentColor;
  }
  .icon {
    width: 1em;
  }
  .size {
    font-size: 1em;
  }
`);

/**
 * @customElement dy-pagination
 * @fires pagechange
 * @fires sizechange
 */
@customElement('dy-pagination')
@adoptedStyle(style)
@adoptedStyle(focusStyle)
@connectStore(locale)
@shadow({ delegatesFocus: true })
@aria({ role: 'listbox', ariaLabel: 'Pagination' })
export class DuoyunPaginationElement extends GemElement {
  @attribute align: 'left' | 'start' | 'right' | 'end' | 'center';
  @numattribute page: number;
  @numattribute total: number;
  @numattribute size: number;

  @emitter pagechange: Emitter<number>;
  @emitter sizechange: Emitter<number>;

  @property sizes?: number[];

  get #align() {
    return this.align || 'flex-end';
  }

  #offset = 2;

  #renderMore = (value: number) => {
    let close: () => void;
    const pageChange = ({ target }: MouseEvent) => {
      const page = Number(((target as HTMLElement).previousElementSibling as HTMLInputElement).value);
      if (!isNaN(page)) {
        this.pagechange(Math.round(page < 0 ? Math.max(1, this.total + 1 + page) : Math.min(page, this.total)));
      }
      close();
    };
    const openMore = (evt: Event) => {
      close = Popover.open(evt.target as Element, {
        trigger: 'click',
        content: html`
          <dy-input-group style="width: 6em">
            <dy-input
              type="number"
              autofocus
              step=${1}
              min=${1}
              max=${this.total}
              value=${String(value)}
              @change=${({ detail, target }: CustomEvent<string>) => ((target as HTMLInputElement).value = detail)}
            ></dy-input>
            <dy-button small @click=${pageChange}> ${locale.ok} </dy-button>
          </dy-input-group>
        `,
      });
    };
    return html`
      <dy-use
        class="icon item more"
        role="combobox"
        tabindex="0"
        @click=${openMore}
        @keydown=${commonHandle}
        .element=${icons.more}
      ></dy-use>
    `;
  };

  // TODO: improve
  #renderItem(page: number) {
    if (page > 1 && page < this.page - this.#offset) {
      if (page === 2) {
        return this.#renderMore(middle(1, this.page - this.#offset));
      } else {
        return html``;
      }
    }
    if (page > this.page + this.#offset && page < this.total) {
      if (page === this.total - 1) {
        return this.#renderMore(middle(this.page + this.#offset, this.total));
      } else {
        return html``;
      }
    }
    return html`
      <div
        role="option"
        tabindex="0"
        @keydown=${commonHandle}
        aria-selected=${page === this.page}
        class=${classMap({ item: true, current: page === this.page })}
        @click=${() => page !== this.page && this.pagechange(page)}
      >
        ${page}
      </div>
    `;
  }

  @updateTheme()
  #theme = () => ({ align: this.#align });

  render = () => {
    if (this.total <= 1) return html``;

    const prevAble = this.page > 1;
    const nextAble = this.page < this.total;
    return html`
      ${this.sizes
        ? html`
            <dy-picker
              class="size"
              fit
              selectmode
              borderless
              .options=${this.sizes.map((size) => ({ label: splice(locale.perPage, String(size)), value: size }))}
              .value=${this.size}
              @change=${({ detail }: CustomEvent<number>) => this.sizechange(detail)}
            ></dy-picker>
          `
        : ''}
      <div
        role="option"
        aria-disabled=${!prevAble}
        tabindex="0"
        @keydown=${commonHandle}
        class=${classMap({ item: true, disabled: !prevAble })}
        @click=${() => prevAble && this.pagechange(this.page - 1)}
      >
        ${locale.prevPage}
      </div>
      ${Array(this.total)
        .fill(null)
        .map((_, index) => this.#renderItem(index + 1))}
      <div
        role="option"
        aria-disabled=${!nextAble}
        tabindex="0"
        @keydown=${commonHandle}
        class=${classMap({ item: true, disabled: !nextAble })}
        @click=${() => nextAble && this.pagechange(this.page + 1)}
      >
        ${locale.nextPage}
      </div>
    `;
  };
}
