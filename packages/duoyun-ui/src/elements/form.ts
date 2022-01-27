import {
  adoptedStyle,
  customElement,
  attribute,
  property,
  boolattribute,
  refobject,
  RefObject,
  state,
} from '@mantou/gem/lib/decorators';
import { GemElement, html, TemplateResult } from '@mantou/gem/lib/element';
import { createCSSSheet, css } from '@mantou/gem/lib/utils';
import { mediaQuery } from '@mantou/gem/helper/mediaquery';

import { theme } from '../lib/theme';
import { locale } from '../lib/locale';

import type { DataList } from './input';
import type { Option } from './pick';
import type { Option as SelectOption } from './select';

import './input';
import './pick';
import './button';
import './checkbox';
import './radio';
import './select';
import './help-text';

const formStyle = createCSSSheet(css`
  dy-form {
    display: block;
  }
  dy-form-item {
    flex-grow: 1;
    margin-bottom: 1.8em;
  }
  dy-form-item[type='checkbox'] {
    flex-grow: 0;
  }
  dy-form-item:where(:--invalid, [data-invalid]) * {
    border-color: ${theme.negativeColor};
  }
  dy-form-item-inline-group {
    display: flex;
    gap: 0.875em;
  }
  @media ${mediaQuery.PHONE} {
    dy-form-item-inline-group {
      display: contents;
    }
  }
`);

/**
 * @customElement dy-form
 */
@customElement('dy-form')
@adoptedStyle(formStyle)
export class DuoyunFormElement<Data = Record<string, any>> extends GemElement {
  get items() {
    return [...this.querySelectorAll<DuoyunFormItemElement>('dy-form-item')];
  }

  get data() {
    const data = {} as Data;
    this.items.forEach((item) => {
      if (!item.name) return;
      Object.assign(data, { [item.name]: item.data });
    });
    return data;
  }

  constructor() {
    super({ isLight: true });
    this.internals.role = 'form';
  }

  async valid() {
    let valid = true;
    for await (const item of this.items) {
      valid = (await item.valid()) && valid;
    }
    return valid;
  }

  clearInvalidMessage() {
    this.items.forEach((e) => e.clearInvalidMessage());
  }
}

/**
 * @customElement dy-form-item-inline-group
 */
@customElement('dy-form-item-inline-group')
export class DuoyunFormItemInlineGroupElement extends GemElement {
  constructor() {
    super({ isLight: true });
  }
}

const formItemStyle = createCSSSheet(css`
  :host {
    display: flex;
    flex-direction: column;
  }
  :host([required]) .label::after {
    content: '＊';
  }
  :host([hidden]) {
    display: none;
  }
  .label {
    font-size: 0.875em;
    line-height: 1.2;
    margin-bottom: 0.4em;
    color: ${theme.describeColor};
  }
  :host(:where(:--invalid, [data-invalid])) .input {
    border-color: ${theme.negativeColor};
  }
  .input {
    width: 100%;
    flex-grow: 1;
    flex-shrink: 1;
  }
  .input + .input,
  .footer {
    margin-top: 10px;
  }
  :host([type='checkbox']) {
    flex-direction: row;
    align-items: center;
  }
  :host([type='checkbox']) .lable {
    flex-direction: row;
    align-items: center;
    margin-bottom: 0;
  }
`);

type FormItemState = {
  value?: number | string | any[];
  checked?: boolean;
  invalidMessage?: string;
};

type FormItemRule = {
  message?: string;
  pattern?: string;
  required?: boolean;
  validator?: (value: any) => Promise<void>;
};

/**
 * @customElement dy-form-item
 * @attr type
 * @attr multiple
 * @attr name
 * @attr label
 * @attr placeholder
 * @attr required
 * @attr checked
 * @attr disabled
 * @attr searchable
 */
@customElement('dy-form-item')
@adoptedStyle(formItemStyle)
export class DuoyunFormItemElement extends GemElement<FormItemState> {
  @attribute type: 'text' | 'number' | 'checkbox' | 'pick' | 'radio' | 'select' | 'textarea' | 'slot';
  @boolattribute multiple: boolean; // pick/select/text
  @attribute name: string;
  @attribute label: string;
  @attribute placeholder: string;
  @boolattribute required: boolean;
  @boolattribute checked: boolean;
  @boolattribute disabled: boolean;
  @boolattribute searchable: boolean;

  @state invalid: boolean;

  @property value?: number | string | any[] | any;
  @property renderLabel: (e: SelectOption) => string | TemplateResult;

  @property rules?: FormItemRule[];

  @property dataList?: DataList | Option[];

  @refobject slotRef: RefObject<HTMLSlotElement>;

  state: FormItemState = {};

  get #type() {
    return this.type || 'text';
  }

  get #slotAssignedElement() {
    return this.slotRef.element!.assignedElements()[0] as any;
  }

  get data() {
    const { value, checked } = this.state;
    if (this.#type === 'checkbox') {
      return value ? (checked ? value : '') : checked;
    }
    return value;
  }

  #onCheckboxChange = ({ detail }: CustomEvent<boolean>) => {
    this.setState({ checked: detail });
  };

  #onChange = ({ detail }: CustomEvent<string | any | any[]>) => {
    this.setState({ value: detail });
  };

  #onTextChangeWithIndex = ({ detail }: CustomEvent<string>, index: number) => {
    const value = (this.state.value || []) as string[];
    this.setState({
      value: [...value.slice(0, index), detail, ...value.slice(index + 1)],
    });
  };

  #onTextCleanWithIndex = async (index: number) => {
    const value = (this.state.value || []) as string[];
    this.setState({
      value: [...value.slice(0, index), ...value.slice(index + 1)],
    });
  };

  #onTextAdd = async () => {
    const value = (this.state.value || []) as string[];
    this.setState({ value: [...value, ''] });
  };

  mounted = () => {
    this.effect(
      ([value, checked]) => {
        this.setState({ value, checked });
        if (this.#type === 'slot') {
          const ele = this.#slotAssignedElement;
          if (ele) ele.value = value;
        }
        this.clearInvalidMessage();
      },
      () => [this.value, this.checked],
    );
    this.effect(
      () => {
        this.invalid = !!this.state.invalidMessage;
      },
      () => [this.state.invalidMessage],
    );
  };

  render = () => {
    const { value, checked, invalidMessage } = this.state;
    return html`
      ${this.#type === 'checkbox' ? '' : html`<div class="label">${this.label}</div>`}
      ${this.#type === 'select'
        ? html`
            <dy-select
              ?disabled=${this.disabled}
              ?searchable=${this.searchable}
              class="input"
              @change=${this.#onChange}
              .multiple=${this.multiple}
              .value=${value}
              .placeholder=${this.placeholder}
              .options=${this.dataList}
              .renderLabel=${this.renderLabel}
            ></dy-select>
          `
        : this.#type === 'pick'
        ? html`
            <dy-pick
              ?disabled=${this.disabled}
              class="input"
              @change=${this.#onChange}
              .multiple=${this.multiple}
              .value=${value}
              .fit=${true}
              .placeholder=${this.placeholder}
              .options=${this.dataList}
            ></dy-pick>
          `
        : this.#type === 'checkbox'
        ? html`
            <dy-checkbox
              @change=${this.#onCheckboxChange}
              ?checked=${checked}
              ?disabled=${this.disabled}
              .value=${value as string}
            >
              ${this.label}
            </dy-checkbox>
          `
        : this.#type === 'radio'
        ? html`
            <dy-radio-group
              @change=${this.#onChange}
              ?disabled=${this.disabled}
              .options=${this.dataList}
              .value=${this.value}
            >
            </dy-radio-group>
          `
        : this.name && this.#type !== 'slot'
        ? this.multiple
          ? html`
              ${(value as string[]).map(
                (value, index) =>
                  html`
                    <dy-input
                      class="input"
                      ?disabled=${this.disabled}
                      @change=${(evt: CustomEvent<string>) => this.#onTextChangeWithIndex(evt, index)}
                      @clear=${() => this.#onTextCleanWithIndex(index)}
                      .clearable=${true}
                      .dataList=${this.dataList}
                      .value=${value}
                    ></dy-input>
                  `,
              )}
              <div class="footer">
                <dy-button .color=${'cancel'} @click=${this.#onTextAdd}>+</dy-button>
              </div>
            `
          : html`
              <dy-input
                class="input"
                type=${this.#type}
                ?disabled=${this.disabled}
                @change=${this.#onChange}
                .value=${value as string}
                .placeholder=${this.placeholder}
                .required=${this.required}
                .dataList=${this.dataList}
              ></dy-input>
            `
        : ''}
      <slot ref=${this.slotRef.ref}></slot>
      ${invalidMessage ? html`<dy-help-text class="tip" status="negative">${invalidMessage}</dy-help-text>` : ''}
    `;
  };

  clearInvalidMessage() {
    this.setState({ invalidMessage: undefined });
  }

  async valid() {
    const rules = [...(this.rules || [])];
    if (this.required && !rules.find((e) => 'required' in e)) {
      rules.push({ required: true });
    }
    for await (const rule of rules) {
      let invalidMessage = '';
      if (rule.required && (!this.value || !this.value.length)) {
        invalidMessage = rule.message || locale.requiredMeg;
      } else if (rule.pattern && !new RegExp(rule.pattern).test(String(this.value || ''))) {
        invalidMessage = rule.message || locale.ptternMsg;
      } else if (rule.validator) {
        try {
          await rule.validator(this.value);
        } catch (err) {
          if (err instanceof Error) {
            invalidMessage = err.message;
          }
        }
      }
      if (invalidMessage) {
        this.setState({ invalidMessage });
        return false;
      }
    }
    return true;
  }
}
