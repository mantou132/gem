import {
  connectStore,
  adoptedStyle,
  customElement,
  attribute,
  globalemitter,
  Emitter,
  property,
  boolattribute,
  refobject,
  RefObject,
  state,
} from '@mantou/gem/lib/decorators';
import { GemElement, html, TemplateResult } from '@mantou/gem/lib/element';
import { createCSSSheet, css, styleMap, classMap, StyleObject } from '@mantou/gem/lib/utils';

import { theme } from '../lib/theme';
import { icons } from '../lib/icons';
import { locale } from '../lib/locale';
import { isIncludesString, setBodyInert } from '../lib/utils';
import { hotkeys } from '../lib/hotkeys';
import { isNotNullish } from '../lib/types';
import { focusStyle } from '../lib/styles';

import './reflect';
import './use';
import './options';
import './input';
import './tag';

const style = createCSSSheet(css`
  :host {
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    border: 1px solid ${theme.borderColor};
    border-radius: ${theme.normalRound};
    line-height: 2;
    padding: 0.1em 0.5em;
    box-sizing: border-box;
    gap: 0.5em;
    font-size: 0.875em;
    width: 15em;
  }
  :host(:where(:hover, :--active, [data-active])) {
    border-color: ${theme.textColor};
  }
  :host([borderless]) {
    width: auto;
    border-color: transparent;
  }
  :host([inline]) {
    display: contents;
    font-size: 1em;
    border-color: ${theme.textColor};
  }
  :host([disabled]) {
    cursor: not-allowed;
    border-color: transparent;
    background: ${theme.disabledColor};
  }
  .inline-options {
    max-height: inherit;
    padding-block: 0;
  }
  .value-wrap {
    width: 0;
    flex-grow: 1;
    display: flex;
    align-items: center;
  }
  :host([borderless]) .value-wrap {
    width: auto;
  }
  .placeholder {
    position: relative;
  }
  .placeholder .value {
    color: ${theme.describeColor};
    position: absolute;
  }
  .value {
    display: flex;
    align-items: center;
    gap: 0.5em;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    padding-inline-end: 0.4em;
    --m: linear-gradient(to right, #000 calc(100% - 0.6em), #fff0 100%);
    -webkit-mask-image: var(--m);
    mask-image: var(--m);
  }
  .search {
    width: 2em;
    flex-grow: 1;
    flex-shrink: 0;
    border: none;
    font-size: 1em;
    margin-block: -1em;
  }
  .search::part(input) {
    padding: 0;
  }
  .icon {
    flex-shrink: 0;
    width: 1.2em;
    padding-block: 0.4em;
    color: ${theme.borderColor};
  }
  :host(:where(:hover, :--active, [data-active])) .icon {
    color: ${theme.textColor};
  }
`);

export interface Option {
  label: string | TemplateResult;
  description?: string | TemplateResult;
  value?: any;
  disabled?: boolean;
}

type State = {
  open: boolean;
  left: number;
  top: number;
  width: number;
  maxHeight: string;
  transform: string;
  search: string;
};

/**
 * @customElement dy-select
 * @attr multiple
 * @attr disabled
 * @attr searchable
 * @attr inline
 * @attr placeholder
 * @attr borderless
 */
@customElement('dy-select')
@adoptedStyle(style)
@adoptedStyle(focusStyle)
@connectStore(icons)
export class DuoyunSelectElement extends GemElement<State> {
  @boolattribute multiple: boolean;
  @boolattribute disabled: boolean;
  @boolattribute searchable: boolean;
  @boolattribute inline: boolean;
  @attribute placeholder: string;
  @boolattribute borderless: boolean;

  @property dropdownStyle?: StyleObject;
  @property options?: Option[];
  @property value?: any | any[];
  @property renderLabel: (e: Option) => string | TemplateResult;
  @property renderTag: (e: Option) => string | TemplateResult;
  @state active: boolean;
  @globalemitter change: Emitter<any | any[]>;

  @refobject searchRef: RefObject<HTMLElement>;
  @refobject optionsRef: RefObject<HTMLElement>;

  get #searchable() {
    return this.searchable && !this.disabled && !this.borderless;
  }

  get #fiteredOptions() {
    const { search } = this.state;
    return search
      ? this.options?.filter(({ label, description = '' }) => isIncludesString(html`${label}${description}`, search))
      : this.options;
  }

  get #value(): any[] | undefined {
    return this.multiple && Array.isArray(this.value)
      ? this.value
      : isNotNullish(this.value)
      ? [this.value]
      : undefined;
  }

  constructor() {
    super();
    this.tabIndex = 0;
    this.effect(() => {
      this.internals.role = this.inline ? undefined : 'combobox';
      this.internals.ariaExpanded = String(this.state.open);
      this.internals.ariaReadOnly = String(this.disabled);
    });
    this.addEventListener('click', this.#open);
    this.addEventListener('keydown', this.#onKeydown);
  }

  state = {
    open: false,
    left: 0,
    top: 0,
    width: 0,
    maxHeight: 'auto',
    transform: 'none',
    search: '',
  };

  #open = () => {
    if (this.disabled) return;
    this.setState({ open: true });
  };

  #close = () => {
    this.setState({ open: false });
  };

  #onKeydown = hotkeys({
    esc: (evt) => {
      if (this.state.open) {
        this.#close();
        if (!this.inline) {
          evt.stopPropagation();
        }
      }
    },
    'space,enter': (evt) => {
      this.#open();
      this.searchRef.element?.focus();
      evt.preventDefault();
    },
  });

  #onEsc = (evt: KeyboardEvent) => {
    this.#close();
    (this.searchRef.element || this).focus();
    evt.stopPropagation();
  };

  #onSearchKeydown = hotkeys({
    backspace: () => {
      if (!this.state.search && this.#valueOptions?.length) {
        if (this.multiple) {
          this.#onRemoveTag(this.#valueOptions[this.#valueOptions.length - 1]);
        } else {
          this.change(undefined);
        }
      }
    },
    tab: (evt) => {
      this.optionsRef.element?.focus();
      evt.preventDefault();
    },
    esc: this.#onEsc,
    enter: (evt) => {
      const options = this.#fiteredOptions;
      if (options?.length === 1) {
        const { value, label } = options[0];
        this.#onChange(value ?? label);
      }
      evt.stopPropagation();
    },
    space: (evt) => {
      evt.stopPropagation();
    },
  });

  #onOptionsKeydown = hotkeys({
    esc: this.#onEsc,
    'shift+tab': (evt) => {
      if (!this.optionsRef.element?.shadowRoot?.activeElement) {
        (this.searchRef.element || this).focus();
        evt.preventDefault();
      }
    },
  });

  #onSearch = (evt: CustomEvent<string>) => {
    this.setState({ search: evt.detail, open: true });
    evt.stopPropagation();
  };

  #onChange = (value: any) => {
    if (this.multiple) {
      if (!this.value) {
        this.change([value]);
      } else if (this.value.includes(value)) {
        this.change(this.value.filter((e: any) => e !== value));
      } else {
        this.change([...this.value, value]);
      }
    } else {
      if (this.value !== value) {
        this.change(value);
      }
      this.setState({ open: false });
    }
    this.setState({ search: '' });
  };

  #onRemoveTag = ({ value, label }: Option) => {
    this.#onChange(value ?? label);
  };

  #valueSet: Set<any>;
  #valueOptions: Option[] | undefined;

  willMount = () => {
    this.memo(
      () => {
        const map = new Map<any, Option>();
        this.options?.forEach((option) => {
          const { value, label } = option;
          map.set(value ?? label, option);
        });
        this.#valueSet = new Set(this.#value);
        this.#valueOptions = this.#value?.map((value) => map.get(value)).filter(isNotNullish);
      },
      () => [this.value, this.options],
    );
  };

  mounted = () => {
    this.effect(
      () => {
        const { open } = this.state;
        this.active = open;
        if (open) {
          const { top, bottom, left, width, height } = this.getBoundingClientRect();
          const isShowTop = innerHeight - bottom < 300;
          this.setState({
            left,
            width,
            open: true,
            top: bottom + 4,
            maxHeight: isShowTop ? `${top - 8}px` : `calc(100vh - ${bottom + 8}px)`,
            transform: isShowTop ? `translateY(calc(-100% - 8px - ${height}px))` : 'none',
          });
          addEventListener('pointerup', this.#close);
        } else {
          this.setState({ open: false });
        }
        return () => removeEventListener('pointerup', this.#close);
      },
      () => [this.state.open],
    );
    this.effect(
      () => {
        if (this.state.open && !this.searchable && !this.inline) {
          const restoreInert = setBodyInert(this.optionsRef.element!);
          this.optionsRef.element?.focus();
          return () => {
            restoreInert();
            this.focus();
          };
        }
      },
      () => [this.state.open],
    );
  };

  render = () => {
    const { open, left, top, width, maxHeight, transform, search } = this.state;
    const isEmpty = !this.#valueOptions?.length;
    const getOptions = () => {
      const options = this.#fiteredOptions?.map((option) => {
        const { value, label, description, disabled } = option;
        return {
          label: this.renderLabel ? this.renderLabel(option) : label,
          description,
          tagIcon: this.#valueSet.has(value ?? label) ? icons.check : undefined,
          onPointerUp: (e: Event) => e.stopPropagation(),
          onClick: () => this.#onChange(value ?? label),
          disabled,
        };
      });
      return search && options?.length === 0
        ? [{ label: locale.noData, disabled: true, onPointerUp: () => this.setState({ search: '' }) }]
        : options;
    };
    return html`
      ${this.inline
        ? html`<dy-options class="inline-options" .options=${getOptions()}></dy-options>`
        : html`
            <div class=${classMap({ 'value-wrap': true, placeholder: isEmpty })}>
              ${!isEmpty || (!search && this.placeholder)
                ? html`
                    <div class="value">
                      ${isEmpty
                        ? this.placeholder
                        : this.multiple
                        ? html`
                            ${this.#valueOptions!.map(({ label }, index) =>
                              typeof label === 'string'
                                ? html`
                                    <dy-tag
                                      small
                                      .closeable=${this.disabled ? false : true}
                                      @keydown=${(evt: KeyboardEvent) => evt.stopPropagation()}
                                      @close=${() => this.#onRemoveTag(this.#valueOptions![index])}
                                    >
                                      ${label}
                                    </dy-tag>
                                  `
                                : this.renderTag
                                ? this.renderTag(this.#valueOptions![index])
                                : label,
                            )}
                          `
                        : this.#valueOptions![0].label}
                    </div>
                  `
                : ''}
              ${this.#searchable
                ? html`
                    <dy-input
                      ref=${this.searchRef.ref}
                      class="search"
                      type="search"
                      value=${search}
                      @keydown=${this.#onSearchKeydown}
                      @change=${this.#onSearch}
                    ></dy-input>
                  `
                : ''}
            </div>
            <dy-use class="icon" .element=${icons.expand}></dy-use>
            ${this.options && open
              ? html`
                  <dy-reflect .target=${document.body}>
                    <dy-options
                      ref=${this.optionsRef.ref}
                      @keydown=${this.#onOptionsKeydown}
                      aria-multiselectable=${this.multiple}
                      style=${styleMap({
                        width: `${Math.max(120, width)}px`,
                        ...this.dropdownStyle,
                        boxShadow: `0 0.3em 1em rgba(0, 0, 0, calc(${theme.maskAlpha} - 0.1))`,
                        position: 'fixed',
                        zIndex: '99999999',
                        left: `${left}px`,
                        top: `${top}px`,
                        maxHeight,
                        transform,
                      })}
                      .options=${getOptions()}
                    ></dy-options>
                  </dy-reflect>
                `
              : ''}
          `}
    `;
  };
}
