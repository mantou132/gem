import { adoptedStyle, customElement, property, boolattribute, slot, aria, shadow } from '@mantou/gem/lib/decorators';
import type { TemplateResult } from '@mantou/gem/lib/element';
import { GemElement, html, css, createState } from '@mantou/gem/lib/element';
import { classMap } from '@mantou/gem/lib/utils';

import { theme } from '../lib/theme';
import { icons } from '../lib/icons';
import { isIncludesString } from '../lib/utils';
import { locale } from '../lib/locale';
import { commonHandle, hotkeys } from '../lib/hotkeys';
import { focusStyle } from '../lib/styles';

import './use';
import './input';

const style = css`
  :host(:where(:not([hidden]))) {
    cursor: default;
    font-size: 0.875em;
    display: flex;
    flex-direction: column;
    padding-block: 0.4em;
    color: ${theme.textColor};
    background: ${theme.backgroundColor};
    border: 1px solid ${theme.borderColor};
    box-sizing: border-box;
    border-radius: ${theme.normalRound};
    overflow: auto;
    scrollbar-width: thin;
    overscroll-behavior: contain;
  }
  .search {
    padding: 0.4em 1em;
  }
  .input {
    width: 100%;
  }
  .item {
    line-height: 1.5;
    padding: 0.4em 1em;
    display: flex;
    align-items: center;
    gap: 0.5em;
  }
  .value {
    flex-grow: 1;
    flex-shrink: 1;
    min-width: 0;
  }
  .tag {
    flex-shrink: 0;
  }
  .tag > * {
    margin: 0;
  }
  .label,
  .description {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .description {
    font-size: 0.875em;
    opacity: 0.7;
  }
  .item:where(:hover),
  .highlight {
    color: ${theme.highlightColor};
  }
  .item:not(.add):hover,
  .highlight {
    background-color: ${theme.lightBackgroundColor};
  }
  .add {
    padding-block: 0;
  }
  .delete:not(:hover) .icon.action {
    display: none;
  }
  .add-input {
    height: calc(1.5em + 2 * 0.4em);
    font-size: 1em;
    border: none;
    padding: 0;
    border-radius: 0;
    width: 100%;
  }
  .add-input::part(input) {
    padding: 0;
  }
  .danger {
    color: ${theme.negativeColor};
  }
  .disabled {
    opacity: 0.7;
    color: ${theme.describeColor};
  }
  .icon {
    flex-shrink: 0;
    position: relative;
    width: 1.2em;
    padding: 0.3em;
    margin: -0.3em;
    border-radius: ${theme.normalRound};
  }
  .action:hover {
    background: ${theme.hoverBackgroundColor};
  }
  .separator {
    background: ${theme.borderColor};
    flex-shrink: 0;
    height: 1px;
    margin: 1px 1em;
  }
  dy-tag {
    padding-block: 0;
  }
`;

export type Option = {
  label: string | TemplateResult;
  icon?: string | DocumentFragment | Element;
  tag?: string | TemplateResult;
  tagIcon?: string | DocumentFragment | Element;
  description?: string | TemplateResult;
  disabled?: boolean;
  danger?: boolean;
  highlight?: boolean;
  onClick?: (evt: MouseEvent) => void;
  onRemove?: (evt: MouseEvent) => void;
  onPointerEnter?: (evt: PointerEvent) => void;
  onPointerLeave?: (evt: PointerEvent) => void;
  onPointerDown?: (evt: PointerEvent) => void;
  onPointerUp?: (evt: PointerEvent) => void;
};

export type Adder = {
  text?: string;
  handle: (value: string) => any;
};

export const SEPARATOR = '---';

@customElement('dy-options')
@adoptedStyle(style)
@adoptedStyle(focusStyle)
@shadow()
@aria({ focusable: true, role: 'listbox' })
export class DuoyunOptionsElement extends GemElement {
  @slot static unnamed: string;

  @boolattribute searchable: boolean;

  @property options?: Option[];
  @property adder?: Adder;

  #state = createState({
    search: '',
    addValue: '',
  });

  #onSearch = ({ detail }: CustomEvent<string>) => {
    this.#state({ search: detail });
  };

  #onAdd = async () => {
    if (!this.#state.addValue) return;
    await this.adder!.handle?.(this.#state.addValue);
    this.#state({ addValue: '' });
  };

  #onRemove = (evt: MouseEvent, onRemove: (evt: MouseEvent) => void) => {
    evt.stopPropagation();
    onRemove(evt);
  };

  #stopPropagation = (evt: Event) => evt.stopPropagation();

  #onAdderKeyDown = hotkeys({
    enter: this.#onAdd,
    esc: () => ({}),
    onUncapture: this.#stopPropagation,
  });

  render = () => {
    const { search } = this.#state;

    const options = search
      ? this.options?.filter(({ label, description = '' }) => isIncludesString(html`${label}${description}`, search))
      : this.options;

    return html`
      <slot></slot>
      <div v-if=${this.searchable} class="search">
        <dy-input
          class="input"
          type="search"
          .icon=${icons.search}
          .placeholder=${locale.search}
          value=${search}
          @change=${this.#onSearch}
        ></dy-input>
      </div>
      <div
        v-if=${!!this.adder}
        role="option"
        tabindex="0"
        class=${classMap({ item: true, add: true })}
        @pointerup=${this.#stopPropagation}
        @keydown=${commonHandle}
      >
        <div class="value">
          <div class="label">
            <dy-input
              class="add-input"
              .value=${this.#state.addValue}
              .placeholder=${this.adder?.text || locale.add}
              @change=${({ detail: addValue }: CustomEvent<string>) => this.#state({ addValue })}
              @keydown=${this.#onAdderKeyDown}
            ></dy-input>
          </div>
        </div>
        <dy-use
          role="button"
          tabindex="0"
          class="icon action"
          .element=${icons.add}
          @click=${this.#onAdd}
          @keydown=${commonHandle}
        ></dy-use>
      </div>
      ${(search && options?.length === 0 ? [{ label: locale.noData, disabled: true }] : options)?.map(
        ({
          label,
          tag = '',
          tagIcon,
          description,
          disabled = false,
          danger,
          highlight = false,
          icon,
          onPointerEnter,
          onPointerLeave,
          onPointerDown,
          onPointerUp,
          onClick,
          onRemove,
        }) => {
          return label === SEPARATOR
            ? html`<div class="separator"></div>`
            : html`
                <div
                  role="option"
                  tabindex="0"
                  aria-readonly=${disabled}
                  aria-selected=${highlight}
                  class=${classMap({
                    item: true,
                    disabled: !!disabled,
                    danger: !!danger,
                    highlight: !!highlight,
                    delete: !!onRemove,
                  })}
                  @pointerenter=${onPointerEnter}
                  @pointerleave=${onPointerLeave}
                  @pointerdown=${onPointerDown}
                  @pointerup=${onPointerUp}
                  @click=${onClick}
                  @keydown=${commonHandle}
                >
                  <dy-use v-if=${!!icon} class="icon" .element=${icon}></dy-use>
                  <div class="value">
                    <div class="label">${label}</div>
                    <div class="description">${description}</div>
                  </div>
                  <div v-if=${!!tag} class="tag">${tag}</div>
                  <dy-use v-if=${!!tagIcon} class="icon" .element=${tagIcon}></dy-use>
                  <dy-use
                    v-if=${!!onRemove}
                    class="icon action"
                    .element=${icons.delete}
                    @pointerup=${this.#stopPropagation}
                    @click=${(evt: MouseEvent) => onRemove && this.#onRemove(evt, onRemove)}
                  ></dy-use>
                </div>
              `;
        },
      )}
    `;
  };
}
