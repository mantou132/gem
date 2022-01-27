import { adoptedStyle, customElement, property, boolattribute } from '@mantou/gem/lib/decorators';
import { GemElement, html, TemplateResult } from '@mantou/gem/lib/element';
import { createCSSSheet, css, classMap } from '@mantou/gem/lib/utils';

import { theme } from '../lib/theme';
import { icons } from '../lib/icons';
import { isIncludesString } from '../lib/utils';
import { locale } from '../lib/locale';
import { commonHandle } from '../lib/hotkeys';
import { focusStyle } from '../lib/styles';

import '@mantou/gem/elements/use';
import './input';

const style = createCSSSheet(css`
  :host {
    cursor: default;
    font-size: 0.875em;
    display: flex;
    flex-direction: column;
    padding-block: 0.4em;
    color: ${theme.textColor};
    background: ${theme.backgroundColor};
    box-shadow: 0 0.3em 1em rgba(0, 0, 0, calc(${theme.maskAlpha} - 0.1));
    border: 1px solid ${theme.borderColor};
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
    gap: 0.5em;
  }
  .value {
    flex-grow: 1;
    flex-shrink: 1;
    min-width: 0;
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
  .item:hover,
  .highlight {
    background-color: ${theme.lightBackgroundColor};
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
`);

export type Option = {
  label: string | TemplateResult;
  icon?: string | DocumentFragment | Element;
  tag?: string | TemplateResult;
  description?: string | TemplateResult;
  disabled?: boolean;
  danger?: boolean;
  highlight?: boolean;
  onClick?: (evt: MouseEvent) => void;
  onPointerEnter?: (evt: PointerEvent) => void;
  onPointerLeave?: (evt: PointerEvent) => void;
  onPointerDown?: (evt: PointerEvent) => void;
  onPointerUp?: (evt: PointerEvent) => void;
};

type State = {
  search: string;
};

/**
 * @customElement dy-options
 * @attr searchable
 */
@customElement('dy-options')
@adoptedStyle(style)
@adoptedStyle(focusStyle)
export class DuoyunOptionsElement extends GemElement<State> {
  @boolattribute searchable: boolean;

  @property options?: Option[];

  state: State = {
    search: '',
  };

  constructor() {
    super();
    this.tabIndex = 0;
    this.internals.role = 'listbox';
  }

  #onSearch = ({ detail }: CustomEvent<string>) => {
    this.setState({ search: detail });
  };

  render = () => {
    const { search } = this.state;

    const options = this.options?.filter(({ label, description = '' }) =>
      isIncludesString(html`${label}${description}`, search),
    );

    return html`
      ${this.searchable
        ? html`
            <div class="search">
              <dy-input
                class="input"
                type="search"
                .icon=${icons.search}
                .placeholder=${locale.search}
                value=${search}
                @change=${this.#onSearch}
              ></dy-input>
            </div>
          `
        : ''}
      ${(search && options?.length === 0 ? [{ label: locale.noData, disabled: true }] : options)?.map(
        ({
          label,
          tag = '',
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
        }) =>
          label === '---'
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
                  })}
                  @pointerenter=${onPointerEnter}
                  @focus=${onPointerEnter}
                  @pointerleave=${onPointerLeave}
                  @pointerdown=${onPointerDown}
                  @pointerup=${onPointerUp}
                  @click=${onClick}
                  @keydown=${commonHandle}
                >
                  <div class="value">
                    <div class="label">${label}</div>
                    <div class="description">${description}</div>
                  </div>
                  ${tag}${icon ? html`<gem-use class="icon" .element=${icon}></gem-use>` : ''}
                </div>
              `,
      )}
      <slot></slot>
    `;
  };
}
