import {
  connectStore,
  adoptedStyle,
  customElement,
  attribute,
  emitter,
  Emitter,
  property,
  numattribute,
} from '@mantou/gem/lib/decorators';
import { GemElement, html } from '@mantou/gem/lib/element';
import { createCSSSheet, css, classMap } from '@mantou/gem/lib/utils';
import { splice } from '@mantou/gem/helper/i18n';

import { locale } from '../lib/locale';
import { theme } from '../lib/theme';
import { icons } from '../lib/icons';
import { commonHandle } from '../lib/hotkeys';
import { focusStyle } from '../lib/styles';

import { Popover } from './popover';

import './use';
import './input';
import './button';
import './pick';

const style = createCSSSheet(css`
  :host {
    display: flex;
    align-items: center;
    font-size: 0.875em;
    gap: 0.4em;
    font-variant-numeric: tabular-nums;
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
  .item:where(:not(.disabled)):hover {
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
    color: ${theme.backgroundColor};
    background-color: ${theme.highlightColor};
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

  constructor() {
    super();
    this.internals.role = 'listbox';
    this.internals.ariaLabel = 'Pagination';
  }

  #offset = 2;

  #renderMore = () => {
    let close: () => void;
    const pageChange = ({ target }: Event) => {
      const { value } = (target as HTMLElement).previousElementSibling as HTMLInputElement;
      const page = Number(value);
      if (!isNaN(page)) {
        this.pagechange(Math.round(page < 0 ? Math.max(1, this.total + 1 + page) : Math.min(page, this.total)));
      }
      close();
    };
    const openMore = (evt: Event) => {
      const { width, top, left } = (evt.target as Element).getBoundingClientRect();
      close = Popover.show(left + width / 2, top, {
        trigger: 'click',
        content: html`
          <dy-input-group style="width: 6em">
            <dy-input
              type="number"
              autofocus
              @change=${({ detail, target }: CustomEvent<string>) => ((target as HTMLInputElement).value = detail)}
            ></dy-input>
            <dy-button small @click=${pageChange}> ${locale.ok} </dy-button>
          </dy-input-group>
        `,
      });
    };
    return html`
      <div class="item more" role="combobox" tabindex="0" @click=${openMore} @keydown=${commonHandle}>
        <dy-use class="icon" .element=${icons.more}></dy-use>
      </div>
    `;
  };

  // TODO: improve
  #renderItem(page: number) {
    if (page > 1 && page < this.page - this.#offset) {
      if (page === 2) {
        return this.#renderMore();
      } else {
        return html``;
      }
    }
    if (page < this.total && page > this.page + this.#offset) {
      if (page === this.total - 1) {
        return this.#renderMore();
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

  render = () => {
    if (this.total <= 1) return html``;

    const prevable = this.page > 1;
    const nextable = this.page < this.total;
    return html`
      <style>
        :host {
          justify-content: ${this.#align};
        }
      </style>
      ${this.sizes
        ? html`
            <dy-pick
              class="size"
              fit
              selectmode
              borderless
              .options=${this.sizes.map((size) => ({ label: splice(locale.perPage, String(size)), value: size }))}
              .value=${this.size}
              @change=${({ detail }: CustomEvent<number>) => this.sizechange(detail)}
            ></dy-pick>
          `
        : ''}
      <div
        role="option"
        aria-disabled=${!prevable}
        tabindex="0"
        @keydown=${commonHandle}
        class=${classMap({ item: true, disabled: !prevable })}
        @click=${() => prevable && this.pagechange(this.page - 1)}
      >
        ${locale.prevPage}
      </div>
      ${Array(this.total)
        .fill(null)
        .map((_, index) => this.#renderItem(index + 1))}
      <div
        role="option"
        aria-disabled=${!nextable}
        tabindex="0"
        @keydown=${commonHandle}
        class=${classMap({ item: true, disabled: !nextable })}
        @click=${() => nextable && this.pagechange(this.page + 1)}
      >
        ${locale.nextPage}
      </div>
    `;
  };
}
