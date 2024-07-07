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
  part,
  focusable,
} from '@mantou/gem/lib/decorators';
import { GemElement, html, TemplateResult } from '@mantou/gem/lib/element';
import { addListener, createCSSSheet, css, styleMap, StyleObject } from '@mantou/gem/lib/utils';

import { theme } from '../lib/theme';
import { icons } from '../lib/icons';
import { locale } from '../lib/locale';
import { isIncludesString } from '../lib/utils';
import { setBodyInert } from '../lib/element';
import { hotkeys } from '../lib/hotkeys';
import { isNotNullish } from '../lib/types';
import { focusStyle } from '../lib/styles';

import { BasePickerElement, pickerStyle } from './picker';
import type { Adder } from './options';

import './reflect';
import './use';
import './options';
import './input';
import './tag';
import './scroll-box';

const style = createCSSSheet(css`
  :host {
    width: 15em;
  }
  :host(:where(:hover, :state(active))) {
    background: none;
    border-color: ${theme.textColor};
  }
  :host(:where([inline]:not([hidden]))) {
    display: contents;
    font-size: 1em;
    border-color: ${theme.textColor};
  }
  .inline-options {
    max-height: inherit;
    padding-block: 0;
    overscroll-behavior: auto;
  }
  .value-wrap {
    width: 0;
    flex-grow: 1;
    display: flex;
    align-items: center;
    gap: 0.5em;
    white-space: nowrap;
    position: relative;
  }
  :host([borderless]) .value-wrap {
    width: auto;
  }
  .placeholder {
    pointer-events: none;
    color: ${theme.describeColor};
  }
  :host(:not([borderless])) .placeholder {
    position: absolute;
    width: 100%;
  }
  .value,
  .placeholder {
    text-overflow: ellipsis;
    overflow: hidden;
  }
  .values {
    display: flex;
    align-items: center;
    gap: 0.5em;
    margin-inline-start: -0.2em;
  }
  dy-tag {
    border-radius: ${theme.smallRound};
  }
  .search {
    width: 2em;
    flex-grow: 1;
    flex-shrink: 0;
    border: none;
    font-size: 1em;
    margin-block: -1em;
    box-shadow: none;
  }
  .search::part(input) {
    padding: 0;
  }
  .search:where(:state(filled), :state(composing)) + .placeholder {
    display: none;
  }
`);

export interface Option {
  label: string | TemplateResult;
  description?: string | TemplateResult;
  value?: any;
  disabled?: boolean;
  onRemove?: (evt: MouseEvent) => void;
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
@adoptedStyle(pickerStyle)
@adoptedStyle(focusStyle)
@connectStore(icons)
@focusable()
export class DuoyunSelectElement extends GemElement<State> implements BasePickerElement {
  @boolattribute multiple: boolean;
  @boolattribute disabled: boolean;
  @boolattribute searchable: boolean;
  @boolattribute keepsearch: boolean;
  @boolattribute inline: boolean;
  @attribute placeholder: string;
  @boolattribute borderless: boolean;
  @boolattribute pinselected: boolean;
  @boolattribute loading: boolean;

  @property dropdownStyle?: StyleObject;
  @property options?: Option[];
  @property adder?: Adder;
  @property value?: any | any[];
  @property renderLabel?: (e: Option) => string | TemplateResult;
  @property renderTag?: (e: Option) => string | TemplateResult;
  @state active: boolean;
  @globalemitter change: Emitter<any | any[]>;
  @globalemitter search: Emitter<string>;

  @refobject searchRef: RefObject<HTMLElement>;
  @refobject optionsRef: RefObject<HTMLElement>;

  @part static tag: string;
  @part static value: string;

  get #searchable() {
    return this.searchable && !this.disabled && !this.borderless;
  }

  get #filteredOptions() {
    const { search } = this.state;
    return search && !this.#isLoading
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
    this.effect(() => {
      this.internals.role = this.inline ? null : 'combobox';
      this.internals.ariaExpanded = String(this.state.open);
      this.internals.ariaReadOnly = String(this.disabled);
    });
    this.addEventListener('click', this.#open);
    this.addEventListener('keydown', this.#onKeydown);
    this.addEventListener('pointerup', (e) => this.state.open && e.stopPropagation());
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

  #open = async () => {
    if (this.disabled) return;
    if (this.state.open) return;
    this.setState({ open: true });
    // safari auto focus
    await Promise.resolve();
    this.searchRef.element?.focus();
  };

  #close = () => {
    if (!this.state.open) return;
    this.setState({ open: false });
  };

  #onKeydown = (evt: KeyboardEvent) => {
    if (this.inline) return;
    hotkeys(
      {
        esc: this.#close,
        'space,enter': this.#open,
      },
      { stopPropagation: true },
    )(evt);
  };

  #onEsc = () => {
    this.#close();
    (this.searchRef.element || this).focus();
  };

  #onSearchKeydown = hotkeys(
    {
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
        if (!this.state.open) return;
        this.optionsRef.element?.focus();
        evt.preventDefault();
      },
      esc: this.#onEsc,
      enter: () => {
        const options = this.#filteredOptions;
        if (options?.length === 1) {
          const { value, label } = options[0];
          this.#onChange(value ?? label);
        }
      },
      space: () => {
        // Used hotkey options
      },
    },
    { preventDefault: false, stopPropagation: true },
  );

  #onOptionsKeydown = hotkeys(
    {
      esc: this.#onEsc,
      'shift+tab': (evt) => {
        if (!this.optionsRef.element?.shadowRoot?.activeElement) {
          (this.searchRef.element || this).focus();
          evt.preventDefault();
        }
      },
    },
    { preventDefault: false, stopPropagation: true },
  );

  #onSearch = (evt: CustomEvent<string>) => {
    this.setState({ search: evt.detail, open: true });
    evt.stopPropagation();
  };

  #onClear = () => {
    this.setState({ search: '' });
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
    if (!this.keepsearch) {
      this.setState({ search: '' });
    }
  };

  #onRemoveTag = ({ value, label }: Option) => {
    this.#onChange(value ?? label);
  };

  #valueSet: Set<any>;
  #valueOptions: Option[] | undefined;
  #isLoading = false;

  willMount = () => {
    this.memo(() => {
      this.#isLoading = this.#isLoading || this.loading;
    });
    this.memo(
      () => {
        const map = new Map<any, Option>();
        const forEach = (option: Option) => {
          const { value, label } = option;
          map.set(value ?? label, option);
        };
        this.#valueOptions?.forEach(forEach);
        this.options?.forEach(forEach);
        this.#valueSet = new Set(this.#value);
        this.#valueOptions = this.#value?.map((value) => map.get(value) || { value, label: value });
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
          return addListener(window, 'pointerup', this.#close);
        } else {
          this.setState({ open: false });
        }
      },
      () => [this.state.open],
    );
    this.effect(
      () => {
        if (this.state.open && !this.searchable && !this.inline && this.optionsRef.element) {
          const restoreInert = setBodyInert(this.optionsRef.element);
          this.optionsRef.element.focus();
          return () => {
            restoreInert();
            this.focus();
          };
        }
      },
      () => [this.state.open],
    );
    this.effect(
      ([search]) => this.search(search),
      () => [this.state.search],
    );
  };

  #getOptions = () => {
    const { search } = this.state;
    if (this.loading) {
      return [
        {
          icon: icons.loading,
          label: locale.loading,
          disabled: true,
          onPointerUp: (e: Event) => e.stopPropagation(),
        },
      ];
    }
    const options = this.#filteredOptions?.map((option) => {
      const { value, label, description, disabled, onRemove } = option;
      return {
        label: this.renderLabel ? this.renderLabel(option) : label,
        description,
        tagIcon: this.#valueSet.has(value ?? label) ? icons.check : undefined,
        onPointerUp: (e: Event) => e.stopPropagation(),
        onClick: disabled ? undefined : () => this.#onChange(value ?? label),
        disabled,
        onRemove,
      };
    });
    if (this.pinselected) {
      options?.sort((a, b) => (a.tagIcon && !b.tagIcon ? -1 : 0));
    }
    return search && options?.length === 0
      ? [{ label: locale.noData, disabled: true, onPointerUp: (e: Event) => e.stopPropagation() }]
      : options;
  };

  render = () => {
    const { open, left, top, width, maxHeight, transform, search } = this.state;
    const isEmpty = !this.#valueOptions?.length;
    if (this.inline) {
      return html`<dy-options class="inline-options" .options=${this.#getOptions()} .adder=${this.adder}></dy-options>`;
    }
    return html`
      <div class="value-wrap">
        ${isEmpty
          ? ''
          : this.multiple
            ? html`
                <dy-scroll-box class="values" part=${DuoyunSelectElement.value}>
                  ${this.#valueOptions!.map(({ label }, index) =>
                    typeof label === 'string'
                      ? html`
                          <dy-tag
                            small
                            part=${DuoyunSelectElement.tag}
                            .closable=${this.disabled ? false : true}
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
                </dy-scroll-box>
              `
            : html`<div class="value">${this.#valueOptions![0].label}</div>`}
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
        ${isEmpty && this.placeholder ? html`<div class="placeholder">${this.placeholder}</div>` : ``}
      </div>
      <dy-use
        class="icon"
        @click=${this.#onClear}
        .tabIndex=${search ? 0 : -1}
        .element=${search ? icons.close : icons.expand}
      ></dy-use>
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
                  boxShadow: `0 7px 14px rgba(0, 0, 0, calc(${theme.maskAlpha} - 0.1))`,
                  position: 'fixed',
                  zIndex: `calc(${theme.popupZIndex} + 2)`,
                  left: `${left}px`,
                  top: `${top}px`,
                  maxHeight,
                  transform,
                })}
                .options=${this.#getOptions()}
                .adder=${this.adder}
              ></dy-options>
            </dy-reflect>
          `
        : ''}
    `;
  };

  showPicker() {
    this.#open();
  }
}
