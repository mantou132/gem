import type { Emitter } from '@mantou/gem/lib/decorators';
import {
  adoptedStyle,
  attribute,
  boolattribute,
  connectStore,
  customElement,
  emitter,
  property,
  template,
} from '@mantou/gem/lib/decorators';
import { createState, css, GemElement, html } from '@mantou/gem/lib/element';

import type { CellItem } from '../elements/cell';
import type { DatePickerType } from '../elements/date-picker';
import type { TapInputElement } from '../elements/input';
import type { SelectItem } from '../elements/select';
import { locale } from '../lib/locale';

import '../elements/button';
import '../elements/cell';
import '../elements/date-picker';
import '../elements/input';
import '../elements/navbar';
import '../elements/page';
import '../elements/select';
import '../elements/stepper';

export type FormValue = Record<string, string | number | boolean>;

export type FormItem = {
  name: string;
  label: string;
  /**Defaults to `text`; `switch` value is a boolean, `stepper` value is a number, others are strings */
  type?: TapInputElement['type'] | DatePickerType | 'select' | 'switch' | 'stepper';
  placeholder?: string;
  /**Disable done while the value is blank */
  required?: boolean;
  /**Options of `select` */
  options?: SelectItem[];
  /**Bounds of `stepper` */
  min?: number;
  max?: number;
  step?: number;
};

export type FormGroup = {
  heading?: string;
  footer?: string;
  items: FormItem[];
};

const dateTypes = new Set<FormItem['type']>(['date', 'time', 'datetime', 'month']);

const style = css({
  $: `
    display: block;
    flex-grow: 1;
    contain: layout;
  `,
  done: `
    margin-inline-end: 0.5em;
  `,
  // 控件融入行内，去掉自身的边框和阴影，值靠右对齐
  control: `
    inline-size: 12em;
    max-inline-size: 100%;
    block-size: 1.5em;
    font-size: 1em;
    border: none;
    box-shadow: none;
    background: transparent;
    text-align: end;
    &:where(tap-input)::part(input) {
      padding-inline: 0;
    }
  `,
  textarea: `
    inline-size: 100%;
    font-size: 1em;
    border: none;
    box-shadow: none;
    background: transparent;
    &::part(input) {
      padding-inline: 0;
    }
  `,
});

/**
 * 多字段表单页，例如编辑资料、新建条目
 *
 * 点击完成后只发出 `change`，携带完整的值，关闭或返回由调用方处理
 */
@customElement('tap-pat-form')
@adoptedStyle(style)
@connectStore(locale)
export class TapPatFormElement extends GemElement {
  @attribute heading: string;
  /**Show the back button of the navbar, pops the closest stack */
  @boolattribute back: boolean;

  @property groups?: FormGroup[];
  @property value?: FormValue;

  @emitter change: Emitter<FormValue>;

  #state = createState({ edits: {} as FormValue });

  get #draft(): FormValue {
    return { ...this.value, ...this.#state.edits };
  }

  get #canDone() {
    const draft = this.#draft;
    const { edits } = this.#state;
    const changed = Object.keys(edits).some((name) => edits[name] !== this.value?.[name]);
    const filled = (this.groups || [])
      .flatMap((group) => group.items)
      .every((item) => !item.required || String(draft[item.name] ?? '').trim());
    return changed && filled;
  }

  #update = (name: string, value: string | number | boolean) => {
    this.#state({ edits: { ...this.#state.edits, [name]: value } });
  };

  // 控件的 `change` 会冒泡，避免和自身的 `change` 混淆
  #onChange = (name: string) => (evt: CustomEvent<string | number>) => {
    evt.stopPropagation();
    this.#update(name, evt.detail);
  };

  #done = () => {
    if (this.#canDone) this.change(this.#draft);
  };

  #renderControl = (item: FormItem, value: string) => {
    const { name, type, placeholder, required } = item;
    if (type === 'select') {
      return html`
        <tap-select
          class=${style.control}
          value=${value}
          placeholder=${placeholder}
          ?required=${required}
          .options=${item.options}
          @change=${this.#onChange(name)}
        ></tap-select>
      `;
    }
    if (dateTypes.has(type)) {
      return html`
        <tap-date-picker
          class=${style.control}
          type=${type as DatePickerType}
          value=${value}
          placeholder=${placeholder}
          ?required=${required}
          @change=${this.#onChange(name)}
        ></tap-date-picker>
      `;
    }
    return html`
      <tap-input
        class=${style.control}
        type=${type as TapInputElement['type']}
        value=${value}
        placeholder=${placeholder}
        ?required=${required}
        clearable
        @change=${this.#onChange(name)}
        @clear=${this.#onChange(name)}
      ></tap-input>
    `;
  };

  #toCell = (item: FormItem): CellItem => {
    const { name, label, type } = item;
    const value = this.#draft[name];
    if (type === 'switch') {
      return { label, checked: !!value, onChange: (checked) => this.#update(name, checked) };
    }
    if (type === 'stepper') {
      return {
        label,
        action: false,
        extra: html`
          <tap-stepper
            value=${Number(value ?? 0)}
            min=${item.min}
            max=${item.max}
            step=${item.step}
            @change=${this.#onChange(name)}
          ></tap-stepper>
        `,
      };
    }
    // 多行文本占满整行，标签作为占位文本
    if (type === 'textarea') {
      return {
        label: html`
          <tap-input
            class=${style.textarea}
            type="textarea"
            value=${String(value ?? '')}
            placeholder=${item.placeholder || label}
            ?required=${item.required}
            @change=${this.#onChange(name)}
          ></tap-input>
        `,
        action: false,
      };
    }
    return { label, action: false, extra: this.#renderControl(item, String(value ?? '')) };
  };

  @template()
  #content = () => {
    return html`
      <tap-page>
        <tap-navbar slot="header" title=${this.heading} ?back=${this.back} default-back>
          <tap-button
            slot="right"
            class=${style.done}
            small
            round
            ?disabled=${!this.#canDone}
            @click=${this.#done}
          >${locale.done}</tap-button>
        </tap-navbar>
        ${(this.groups || []).map(
          (group) => html`
            <tap-cell-group
              heading=${group.heading || ''}
              footer=${group.footer || ''}
              .items=${group.items.map(this.#toCell)}
            ></tap-cell-group>
          `,
        )}
      </tap-page>
    `;
  };
}
