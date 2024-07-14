import { html, GemElement, TemplateResult } from '@mantou/gem/lib/element';
import { adoptedStyle, customElement, property, refobject, RefObject, shadow } from '@mantou/gem/lib/decorators';
import { GemError, StyleObject, createCSSSheet, css, styleMap } from '@mantou/gem/lib/utils';
import { history } from '@mantou/gem/lib/history';
import { ifDefined } from '@mantou/gem/lib/directives';

import { icons } from '../lib/icons';
import { blockContainer, focusStyle } from '../lib/styles';
import { readProp } from '../lib/utils';
import { theme } from '../lib/theme';
import { Drawer } from '../elements/drawer';
import { Modal, ModalOpenOptions, ModalOptions } from '../elements/modal';
import { DuoyunWaitElement, waitLoading } from '../elements/wait';
import type { DuoyunFormElement, DuoyunFormItemElement } from '../elements/form';
import { DuoyunInputElement } from '../elements/input';
import { DuoyunSelectElement } from '../elements/select';
import { DuoyunDatePickerElement } from '../elements/date-picker';
import { DuoyunDateRangePickerElement } from '../elements/date-range-picker';
import { DuoyunPickerElement } from '../elements/picker';
import { locale } from '../lib/locale';

import '../elements/form';

// ts 5.4
declare global {
  interface MapConstructor {
    /**
     * Groups members of an iterable according to the return value of the passed callback.
     * @param items An iterable.
     * @param keySelector A callback which will be invoked for each item in items.
     */
    groupBy<K, T>(items: Iterable<T>, keySelector: (item: T, index: number) => K): Map<K, T[]>;
  }
}

type FormItemProps<T = unknown> = {
  label: string;
  type: DuoyunFormItemElement['type'];
  field: keyof T | string[];
  style?: StyleObject;
  disabled?: boolean;
  hidden?: boolean;
  ignore?: boolean;
  required?: boolean;
  rules?: DuoyunFormItemElement['rules'];
  slot?: TemplateResult | HTMLElement | HTMLElement[];
  autofocus?: boolean;

  placeholder?: string;
  multiple?: boolean;
  searchable?: boolean;
  clearable?: boolean;

  // textarea
  rows?: number;
  // number input
  step?: number;
  min?: number;
  max?: number;

  options?: DuoyunFormItemElement['options'];
  dependencies?: (keyof T | string[])[];
  /**dependencies change, text change, text clear select search */
  getOptions?: (search: string, data: T) => Promise<DuoyunFormItemElement['options']>;
  /**dependencies change, this.data change */
  getInitValue?: (data: T) => any;

  /**update field setting for any field change */
  update?: (data: T) => Partial<FormItemProps<T>>;
};

export type FormItem<T = unknown> =
  | TemplateResult
  | FormItemProps<T>
  // `dy-form-item-inline-group`
  | FormItemProps<T>[]
  // fieldset, expandable
  | {
      fieldset: (TemplateResult | FormItemProps<T> | FormItemProps<T>[])[];
      label?: string;
    };

const style = createCSSSheet(css`
  dy-form {
    width: 100%;
  }
  .template {
    margin-block-end: 1em;
    font-size: 0.875em;
  }
  dy-form-item[rows='0'] {
    field-sizing: content;
  }
  details {
    margin-block-end: 1.8em;
  }
  summary {
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 1px;
    border-radius: ${theme.normalRound};
  }
  summary dy-use {
    width: 1.2em;
  }
  summary::marker,
  summary::-webkit-details-marker {
    display: none;
  }
  details[open] summary {
    display: none;
  }
`);

type OptionsRecord = {
  loading: boolean;
  options?: DuoyunFormItemElement['options'];
};

type State<T> = {
  data: T;
  optionsRecord: Partial<Record<string, OptionsRecord>>;
  ignoreCache: Partial<Record<string, any>>;
};

/**
 * @customElement dy-pat-form
 */
@customElement('dy-pat-form')
@adoptedStyle(blockContainer)
@adoptedStyle(focusStyle)
@adoptedStyle(style)
@shadow()
export class DyPatFormElement<T = Record<string, unknown>> extends GemElement<State<T>> {
  @refobject formRef: RefObject<DuoyunFormElement>;

  @property data?: T;
  @property formItems?: FormItem<T>[];

  state: State<T> = {
    data: {} as T,
    optionsRecord: {},
    ignoreCache: {},
  };

  #onChange = ({ detail }: CustomEvent<any>) => {
    const data = Object.keys(detail).reduce((prev, key) => {
      const val = detail[key];
      const path = key.split(',');
      Reflect.set(readProp(prev, path.slice(0, -1), { fill: true }), path.at(-1)!, val);
      return prev;
    }, {} as any);
    this.setState({ data });

    this.#forEachFormItems((props) => {
      if (!props.update && props.type !== 'number') return;

      const path = Array.isArray(props.field) ? props.field : [props.field];
      const wrapObj = readProp(data, path.slice(0, -1) as string[]);
      const lastKey = path.at(-1)!;
      const val = wrapObj[lastKey];

      if (props.type === 'number') {
        Reflect.set(wrapObj, lastKey, Number(val) || 0);
      }

      if (!props.update) return;
      Object.assign(props, props.update(data));

      if (props.ignore) {
        this.state.ignoreCache[String(props.field)] = val;
        Reflect.deleteProperty(wrapObj, lastKey);
      } else if (val === undefined) {
        Reflect.set(wrapObj, lastKey, this.state.ignoreCache[String(props.field)]);
      }
    });
  };

  #onOptionsChange = async (props: FormItemProps<T>, input: string) => {
    if (!props.getOptions) return;
    const { optionsRecord, data } = this.state;
    const options = (optionsRecord[String(props.field)] ||= {} as OptionsRecord);
    options.loading = true;
    this.update();
    try {
      options.options = await props.getOptions(input, data);
    } finally {
      options.loading = false;
      this.update();
    }
  };

  #setStateInitValue = (props: FormItemProps<T>) => {
    const { data } = this.state;
    const { field } = props;
    const initValue = props.getInitValue?.(data) ?? readProp(this.data || {}, field);
    if (Array.isArray(field)) {
      readProp(data!, field.slice(0, -1))[field.at(-1)!] = initValue;
    } else {
      data[field] = initValue;
    }
  };

  #deps = new Map<string, Set<FormItemProps<T>>>();
  #onItemChange = ({ detail }: CustomEvent<{ name: string }>) => {
    this.#deps.get(detail.name)?.forEach((props) => {
      this.#setStateInitValue(props);
      this.update();
      this.#onOptionsChange(props, '');
    });
  };

  #forEachFormItems = (process: (props: FormItemProps<T>) => void) => {
    const each = (items: FormItemProps<T> | FormItemProps<T>[]) => [items].flat().forEach(process);
    this.formItems?.forEach((item) => {
      if (item instanceof TemplateResult) return;
      if ('fieldset' in item) {
        item.fieldset.forEach(each);
      } else {
        each(item);
      }
    });
  };

  #isFormItemProps = (e: FormItem<T>): e is FormItemProps<T> =>
    !Array.isArray(e) && !('fieldset' in e) && !(e instanceof TemplateResult);

  #filterVisibleItems = (items: FormItemProps<T>[]) => items.filter((e) => !e.ignore && !e.hidden);

  #getInputGroup = (items?: FormItem<T>[]) => {
    return Map.groupBy(
      (items || []).filter(this.#isFormItemProps).filter((e) => !!e.label),
      (e) => e.label,
    );
  };

  #formInputEleMap = new Map<string, HTMLElement>();
  #createFormInputElement = (type: FormItemProps['type']) => {
    switch (type) {
      case 'text':
      case 'textarea':
      case 'number':
        return new DuoyunInputElement();
      case 'select':
        return new DuoyunSelectElement();
      case 'date':
      case 'date-time':
        return new DuoyunDatePickerElement();
      case 'date-range':
        return new DuoyunDateRangePickerElement();
      case 'picker':
        return new DuoyunPickerElement();
      default:
        throw new GemError('Not support type: `' + type + '`');
    }
  };

  #renderInputGroup = (allItems: FormItemProps<T>[]) => {
    const { optionsRecord, data } = this.state;
    const shadowFormItems = html`
      ${allItems.map((props) =>
        this.#renderItem({
          label: '',
          field: props.field,
          type: props.type,
          multiple: props.multiple,
          ignore: props.ignore,
          hidden: true,
        }),
      )}
    `;
    const items = this.#filterVisibleItems(allItems);
    const flatRules = items.map(({ rules = [] }) => rules).flat();
    const requiredItems = items.filter(({ required }) => required);
    if (requiredItems.length) {
      flatRules.push({
        async validator() {
          const isInvalid = requiredItems.some((e) => {
            const value = readProp(data!, e.field);
            return Array.isArray(value) ? !value.length : !value;
          });
          if (isInvalid) throw new Error(locale.requiredMeg);
        },
      });
    }
    return html`
      ${shadowFormItems}
      ${items.length
        ? html`
            <dy-form-item .label=${items[0].label} .rules=${flatRules}>
              <dy-input-group>
                ${items.map((props) => {
                  const name = String(props.field);
                  const key = props.type + name;
                  if (!this.#formInputEleMap.has(key)) {
                    const ele = this.#createFormInputElement(props.type);
                    ele.addEventListener('change', (evt: CustomEvent<any>) => {
                      this.#onInputChange(evt, props);
                      this.formRef.element?.dispatchEvent(
                        new CustomEvent('itemchange', {
                          detail: { name: name, value: evt.detail },
                        }),
                      );
                    });
                    ele.addEventListener('clear', (evt: CustomEvent<any>) => {
                      this.#onInputChange(evt, props);
                    });
                    ele.addEventListener('search', (evt: CustomEvent<any>) => {
                      this.#onInputSearch(evt, props);
                    });
                    this.#formInputEleMap.set(key, ele);
                  }

                  // 假设控件没有属性冲突
                  return Object.assign(this.#formInputEleMap.get(key)!, {
                    type: props.type,
                    time: props.type === 'date-time',
                    style: styleMap(props.style || {}),
                    value: readProp(data!, props.field),
                    loading: !!optionsRecord[name]?.loading,
                    options: props.options || optionsRecord[name]?.options,
                    dataList: props.options || optionsRecord[name]?.options,
                    disabled: props.disabled,
                    autofocus: props.autofocus,
                    clearable: props.clearable,
                    searchable: props.searchable,
                    multiple: props.multiple,
                    placeholder: props.placeholder,
                    rows: props.rows,
                    step: props.step,
                    min: props.min,
                    max: props.max,
                  });
                })}
              </dy-input-group>
            </dy-form-item>
          `
        : ''}
    `;
  };

  #onInputChange = (evt: CustomEvent, props: FormItemProps<T>) =>
    props.type === 'text' && this.#onOptionsChange(props, evt.detail);
  #onInputSearch = (evt: CustomEvent, props: FormItemProps<T>) =>
    props.type === 'select' && this.#onOptionsChange(props, evt.detail);

  #renderItem = (props: FormItemProps<T>) => {
    const { optionsRecord, data } = this.state;
    if (props.ignore) return html``;

    const name = String(props.field);
    const onChange = (evt: CustomEvent) => this.#onInputChange(evt, props);
    const onSearch = (evt: CustomEvent) => this.#onInputSearch(evt, props);
    return html`
      <dy-form-item
        .rules=${props.rules}
        .label=${props.label}
        .value=${readProp(data!, props.field)}
        .name=${name}
        .type=${props.type}
        style=${
          styleMap(props.style || {})
          // 以上是 `<dy-form-item>` 特有的
        }
        .loading=${!!optionsRecord[name]?.loading}
        .options=${props.options || optionsRecord[name]?.options}
        ?hidden=${props.hidden}
        ?disabled=${props.disabled}
        ?autofocus=${props.autofocus}
        ?clearable=${props.clearable}
        ?searchable=${props.searchable || !!props.getOptions}
        ?required=${props.required}
        ?multiple=${props.multiple /**影响值 */}
        placeholder=${ifDefined(props.placeholder)}
        rows=${ifDefined(props.rows)}
        step=${ifDefined(props.step)}
        min=${ifDefined(props.min)}
        max=${ifDefined(props.max)}
        @change=${onChange}
        @clear=${onChange}
        @search=${onSearch}
      >
        ${props.slot}
      </dy-form-item>
    `;
  };

  #renderInlineGroup = (items: FormItemProps<T>[]) => {
    return html`<dy-form-item-inline-group>${this.#renderItems(items)}</dy-form-item-inline-group>`;
  };

  #renderItems = (items: FormItem<T>[] = []): TemplateResult => {
    const inputGroup = this.#getInputGroup(items);
    return html`
      ${items.map((item) => {
        if (item instanceof TemplateResult) {
          return html`<div class="template">${item}</div>`;
        }
        if (Array.isArray(item)) {
          return this.#renderInlineGroup(item);
        }
        if ('fieldset' in item) {
          return html`
            <details ?hidden=${!this.#filterVisibleItems(item.fieldset.flat().filter(this.#isFormItemProps)).length}>
              <summary><dy-use .element=${icons.right}></dy-use>${item.label}</summary>
              ${this.#renderItems(item.fieldset)}
            </details>
          `;
        }
        const inputs = inputGroup.get(item.label);
        if (inputs) {
          switch (inputs.length) {
            case 0:
              return '';
            case 1:
              return this.#renderItem(item);
            default: {
              const result = this.#renderInputGroup(inputs);
              inputs.length = 0;
              return result;
            }
          }
        }
        return this.#renderItem(item);
      })}
    `;
  };

  willMount() {
    this.memo(
      () => {
        if (this.data) {
          this.state.data = structuredClone(this.data);
        }
      },
      () => [this.data],
    );
    this.memo(
      () => {
        this.#forEachFormItems((props) => {
          props.dependencies?.forEach((field) => {
            const key = String(field);
            const set = this.#deps.get(key) || new Set();
            set.add(props);
            this.#deps.set(key, set);
          });
        });
      },
      () => [this.formItems],
    );
  }

  render = () => {
    return html`
      <dy-form @change=${this.#onChange} @itemchange=${this.#onItemChange} ref=${this.formRef.ref}>
        ${this.#renderItems(this.formItems)}
      </dy-form>
    `;
  };

  valid = () => this.formRef.element!.valid();
}

type CreateFormOptions<T> = {
  type?: 'modal' | 'drawer';
  style?: StyleObject;
  query?: [string, any];
} & ModalOptions &
  ModalOpenOptions<T> &
  Pick<DyPatFormElement<T>, 'formItems' | 'data'>;

/**
 * !WARNING
 *
 * form field not contain `,`
 */
export function createForm<T = Record<string, unknown>>(options: CreateFormOptions<T>) {
  const containerType = options.type === 'modal' ? Modal : Drawer;
  const { query } = history.getParams();
  if (options.query) {
    query.setAny(options.query[0], options.query[1]);
    history.replace({ query });
  }
  return containerType
    .open<DyPatFormElement<T>>({
      header: options.header,
      body: html`
        <dy-pat-form
          style=${styleMap(Object.assign({ minWidth: '30em' }, options.style))}
          .formItems=${options.formItems}
          .data=${options.data}
        ></dy-pat-form>
      `,
      prepareClose: (ele) => options.prepareClose?.(ele.state.data),
      prepareOk: async (ele) => {
        const valid = await ele.valid();
        if (!valid) throw null;
        await waitLoading(options.prepareOk?.(ele.state.data));
        await DuoyunWaitElement.instance?.removed;
      },
    })
    .then((ele) => ele.state.data)
    .catch((ele) => {
      throw ele.state.data;
    })
    .finally(() => {
      if (options.query) {
        query.delete(options.query[0]);
        history.replace({ query });
      }
    });
}
