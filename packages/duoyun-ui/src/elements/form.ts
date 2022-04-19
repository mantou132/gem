import {
  adoptedStyle,
  customElement,
  attribute,
  property,
  boolattribute,
  refobject,
  RefObject,
  state,
  part,
  globalemitter,
  Emitter,
} from '@mantou/gem/lib/decorators';
import { GemElement, html, TemplateResult } from '@mantou/gem/lib/element';
import { createCSSSheet, css } from '@mantou/gem/lib/utils';
import { mediaQuery } from '@mantou/gem/helper/mediaquery';

import { theme } from '../lib/theme';
import { locale } from '../lib/locale';

import type { DataList } from './input';
import type { Option } from './pick';
import type { Option as SelectOption } from './select';
import type { Adder } from './options';

import './input';
import './pick';
import './button';
import './checkbox';
import './radio';
import './select';
import './help-text';
import './date-pick';
import './date-range-pick';

const formStyle = createCSSSheet(css`
  dy-form {
    display: block;
  }
  dy-form[inline] {
    display: flex;
    flex-wrap: wrap;
    gap: 1em;
  }
  dy-form[inline] dy-form-item {
    position: relative;
    gap: 0.5em;
    align-items: center;
    flex-direction: row;
    flex-grow: 0;
    margin-block-end: 0;
  }
  dy-form[inline] dy-form-item::part(label) {
    margin-block-end: 0;
  }
  dy-form[inline] dy-form-item::part(input) {
    width: 15em;
  }
  dy-form[inline] dy-form-item::part(input),
  dy-form[inline] dy-form-item::part(add) {
    margin-block-start: 0;
  }
  dy-form[inline] dy-form-item::part(tip) {
    position: absolute;
    width: 100%;
    top: 100%;
    left: 0;
  }
  dy-form-item {
    flex-grow: 1;
    margin-block-end: 1.8em;
  }
  dy-form-item[type='checkbox'] {
    flex-grow: 0;
  }
  dy-form-item:where(:--invalid, [data-invalid]) * {
    border-color: ${theme.negativeColor};
  }
  dy-form-item-inline-group {
    display: flex;
    gap: 1em;
  }
  @media ${mediaQuery.PHONE} {
    dy-form-item-inline-group {
      display: contents;
    }
  }
`);

/**
 * @customElement dy-form
 * @attr inline
 */
@customElement('dy-form')
@adoptedStyle(formStyle)
export class DuoyunFormElement<Data = Record<string, any>> extends GemElement {
  @boolattribute inline: boolean;

  @globalemitter change: Emitter<Data>;

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
    this.addEventListener('itemchange', (evt: CustomEvent<{ name: string; value: string }>) => {
      evt.stopPropagation();
      const { name, value } = evt.detail;
      this.change({ ...this.data, [name]: value });
    });
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
  .label:empty {
    display: none;
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
  invalidMessage?: string;
};

type FormItemRule = {
  message?: string;
  pattern?: string | RegExp;
  required?: boolean;
  validator?: (value: any) => void | Promise<void>;
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
 * @attr clearable
 */
@customElement('dy-form-item')
@adoptedStyle(formItemStyle)
export class DuoyunFormItemElement extends GemElement<FormItemState> {
  @part static label: string;
  @part static tip: string;
  @part static input: string;
  @part static add: string;

  @attribute type:
    | 'text'
    | 'password'
    | 'date'
    | 'date-range'
    | 'number'
    | 'checkbox'
    | 'checkbox-group' // value is array
    | 'pick'
    | 'radio-group'
    | 'select'
    | 'textarea'
    | 'slot';
  @boolattribute multiple: boolean; // pick/select/text
  @attribute name: string;
  @attribute label: string;
  @attribute placeholder: string;
  @boolattribute required: boolean;
  @boolattribute checked: boolean;
  @boolattribute disabled: boolean;
  @boolattribute searchable: boolean;
  @boolattribute clearable: boolean;
  @boolattribute time: boolean;

  @state invalid: boolean;

  @property value?: number | string | any[] | any;
  @property renderLabel: (e: SelectOption) => string | TemplateResult;

  @property rules?: FormItemRule[];

  @property dataList?: DataList | Option[] | SelectOption[];
  @property adder?: Adder; // select

  @globalemitter itemchange: Emitter<{ name: string; value: number | string | any[] | any }>;

  @refobject slotRef: RefObject<HTMLSlotElement>;

  state: FormItemState = {};

  get #type() {
    return this.type || 'text';
  }

  get #slotAssignedElement() {
    return this.slotRef.element!.assignedElements()[0] as any;
  }

  get data() {
    const { value, checked } = this;
    if (this.#type === 'checkbox') {
      return value ? (checked ? value : '') : checked;
    }
    return value;
  }

  constructor() {
    super();
    this.addEventListener('change', (evt: CustomEvent) => {
      if (!this.name) {
        evt.stopPropagation();
      }
      if (this.#type === 'slot') {
        this.#change(evt.detail);
      }
    });
  }

  #change = (value: number | string | any[] | any) => {
    if (this.name) {
      this.itemchange({ name: this.name, value });
    }
  };

  #onChange = (evt: CustomEvent<any>) => {
    evt.stopPropagation();
    this.#change(evt.detail);
  };

  #onCheckboxChange = (evt: CustomEvent<boolean>) => {
    evt.stopPropagation();
    this.#change(this.value ? (evt.detail ? this.value : '') : evt.detail);
  };

  #onTextChangeWithIndex = (evt: CustomEvent<string>, index: number) => {
    evt.stopPropagation();
    const value = (this.value || []) as string[];
    this.#change([...value.slice(0, index), evt.detail, ...value.slice(index + 1)]);
  };

  #onTextCleanWithIndex = async (index: number) => {
    this.#change(((this.value || []) as string[]).filter((_, i) => i !== index));
  };

  #onTextAdd = async () => {
    this.#change([...((this.value || []) as string[]), '']);
  };

  mounted = () => {
    this.effect(
      ([value]) => {
        this.clearInvalidMessage();
        if (this.#type === 'slot') {
          const ele = this.#slotAssignedElement;
          if (ele) ele.value = value;
        }
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
    const { invalidMessage } = this.state;
    return html`
      ${this.#type === 'checkbox'
        ? ''
        : html`<div class="label" part=${DuoyunFormItemElement.label}>${this.label}</div>`}
      ${this.#type === 'select'
        ? html`
            <dy-select
              ?disabled=${this.disabled}
              ?searchable=${this.searchable}
              class="input"
              part=${DuoyunFormItemElement.input}
              @change=${this.#onChange}
              .multiple=${this.multiple}
              .adder=${this.adder}
              .value=${this.value}
              .placeholder=${this.placeholder}
              .options=${this.dataList}
              .renderLabel=${this.renderLabel}
            ></dy-select>
          `
        : this.#type === 'date'
        ? html`
            <dy-date-pick
              class="input"
              @change=${this.#onChange}
              @clear=${(evt: any) => evt.target.change(undefined)}
              ?disabled=${this.disabled}
              .value=${this.value}
              .time=${this.time}
              .placeholder=${this.placeholder}
              .clearable=${!this.required}
            >
            </dy-date-pick>
          `
        : this.#type === 'date-range'
        ? html`
            <dy-date-range-pick
              class="input"
              @change=${this.#onChange}
              @clear=${(evt: any) => evt.target.change(undefined)}
              ?disabled=${this.disabled}
              .value=${this.value}
              .placeholder=${this.placeholder}
              .clearable=${!this.required}
            >
            </dy-date-range-pick>
          `
        : this.#type === 'pick'
        ? html`
            <dy-pick
              ?disabled=${this.disabled}
              class="input"
              part=${DuoyunFormItemElement.input}
              @change=${this.#onChange}
              .multiple=${this.multiple}
              .value=${this.value}
              .fit=${true}
              .placeholder=${this.placeholder}
              .options=${this.dataList}
            ></dy-pick>
          `
        : this.#type === 'checkbox'
        ? html`
            <dy-checkbox
              @change=${this.#onCheckboxChange}
              ?checked=${this.checked}
              ?disabled=${this.disabled}
              .value=${this.value as string}
            >
              ${this.label}
            </dy-checkbox>
          `
        : this.#type === 'radio-group'
        ? html`
            <dy-radio-group
              @change=${this.#onChange}
              ?disabled=${this.disabled}
              .options=${this.dataList}
              .value=${this.value}
            >
            </dy-radio-group>
          `
        : this.#type === 'checkbox-group'
        ? html`
            <dy-checkbox-group
              @change=${this.#onChange}
              ?disabled=${this.disabled}
              .options=${this.dataList}
              .value=${this.value}
            >
            </dy-checkbox-group>
          `
        : this.name && this.#type !== 'slot'
        ? this.multiple
          ? html`
              ${(this.value as string[])?.map(
                (value, index) =>
                  html`
                    <dy-input
                      class="input"
                      part=${DuoyunFormItemElement.input}
                      ?disabled=${this.disabled}
                      .placeholder=${this.placeholder}
                      @change=${(evt: CustomEvent<string>) => this.#onTextChangeWithIndex(evt, index)}
                      @clear=${() => this.#onTextCleanWithIndex(index)}
                      .clearable=${true}
                      .alwayclearable=${true}
                      .dataList=${this.dataList}
                      .value=${value}
                    ></dy-input>
                  `,
              )}
              <div class="footer" part=${DuoyunFormItemElement.add}>
                <dy-button .color=${'cancel'} @click=${this.#onTextAdd}>+</dy-button>
              </div>
            `
          : html`
              <dy-input
                class="input"
                part=${DuoyunFormItemElement.input}
                type=${this.#type}
                ?disabled=${this.disabled}
                @change=${this.#onChange}
                @clear=${(evt: any) => evt.target.change('')}
                .clearable=${this.clearable}
                .value=${this.value as string}
                .placeholder=${this.placeholder}
                .required=${this.required}
                .dataList=${this.dataList}
              ></dy-input>
            `
        : ''}
      <slot ref=${this.slotRef.ref}></slot>
      ${invalidMessage
        ? html`
            <dy-help-text class="tip" part=${DuoyunFormItemElement.tip} status="negative">
              ${invalidMessage}
            </dy-help-text>
          `
        : ''}
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
      if (rule.required && (!this.value || (Array.isArray(this.value) && !this.value.length))) {
        invalidMessage = rule.message || locale.requiredMeg;
      } else if (rule.pattern && !new RegExp(rule.pattern).test(String(this.value || ''))) {
        invalidMessage = rule.message || locale.ptternMsg;
      } else if (rule.validator) {
        try {
          await rule.validator(this.value);
        } catch (err) {
          if (err instanceof Error) {
            invalidMessage = err.message;
          } else {
            invalidMessage = err;
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
