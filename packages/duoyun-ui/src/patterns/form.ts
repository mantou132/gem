import { html, GemElement, TemplateResult, ifDefined } from '@mantou/gem/lib/element';
import { adoptedStyle, customElement, property, refobject, RefObject } from '@mantou/gem/lib/decorators';
import { StyleObject, createCSSSheet, css, styleMap } from '@mantou/gem/lib/utils';
import { history } from '@mantou/gem/lib/history';

import { icons } from '../lib/icons';
import { blockContainer, focusStyle } from '../lib/styles';
import { readProp } from '../lib/utils';
import { theme } from '../lib/theme';
import { Drawer } from '../elements/drawer';
import { Modal, ModalOpenOptions, ModalOptions } from '../elements/modal';
import { DuoyunWaitElement, waitLoading } from '../elements/wait';
import type { DuoyunFormElement, DuoyunFormItemElement } from '../elements/form';

import '../elements/form';

type FormItemProps<T = unknown> = {
  label: string;
  type: DuoyunFormItemElement['type'];
  field: keyof T | string[];

  options?: DuoyunFormItemElement['options'];
  dependencies?: (keyof T | string[])[];
  /**dependencies change, text change, text clear select search */
  getOptions?: (search: string, data: T) => Promise<DuoyunFormItemElement['options']>;
  /**dependencies change, this.data change */
  getInitValue?: (data: T) => any;
  multiple?: boolean;
  placeholder?: string;
  searchable?: boolean;
  clearable?: boolean;

  // textarea
  rows?: number;
  // number input
  step?: number;
  min?: number;
  max?: number;

  required?: boolean;
  rules?: DuoyunFormItemElement['rules'];

  slot?: TemplateResult | HTMLElement | HTMLElement[];

  /**all change */
  isHidden?: (data: T) => boolean;
};

export type FormItem<T = unknown> =
  | FormItemProps<T>
  | FormItemProps<T>[]
  | {
      group: (FormItemProps<T> | FormItemProps<T>[])[];
      label?: string;
    };

const style = createCSSSheet(css`
  dy-form {
    width: 100%;
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
};

/**
 * @customElement dy-pat-form
 */
@customElement('dy-pat-form')
@adoptedStyle(blockContainer)
@adoptedStyle(focusStyle)
@adoptedStyle(style)
export class DyPatFormElement<T = Record<string, unknown>> extends GemElement<State<T>> {
  @refobject formRef: RefObject<DuoyunFormElement>;

  @property data?: T;
  @property formItems?: FormItem<T>[];

  state: State<T> = {
    data: {} as T,
    optionsRecord: {},
  };

  #onChange = ({ detail }: CustomEvent<any>) => {
    this.setState({
      data: Object.keys(detail).reduce((data, key) => {
        const val = detail[key];
        const path = key.split(',');
        if (path.length === 1) {
          data[key] = val;
        } else {
          const lastKey = path.pop()!;
          const wrapObj = path.reduce((obj, key) => (obj[key] ||= {}), data);
          wrapObj[lastKey] = val;
        }
        return data;
      }, {} as any),
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

  #renderItem = (props: FormItemProps<T>) => {
    const { optionsRecord, data } = this.state;
    if (props.isHidden?.(data as unknown as T)) return html``;

    const name = String(props.field);
    const onChange = (evt: CustomEvent) => props.type === 'text' && this.#onOptionsChange(props, evt.detail);
    const onSearch = (evt: CustomEvent) => props.type === 'select' && this.#onOptionsChange(props, evt.detail);
    return html`
      <dy-form-item
        .label=${props.label}
        .value=${readProp(this.state.data!, props.field)}
        .name=${name}
        .type=${props.type}
        .placeholder=${props.placeholder || ''}
        .rules=${props.rules}
        .loading=${!!optionsRecord[name]?.loading}
        .options=${props.options || optionsRecord[name]?.options}
        ?multiple=${props.multiple}
        ?clearable=${props.clearable}
        ?searchable=${props.searchable || !!props.getOptions}
        ?required=${props.required}
        rows=${ifDefined(props.rows)}
        step=${ifDefined(props.step)}
        min=${ifDefined(props.min)}
        max=${ifDefined(props.max)}
        @change=${onChange}
        @clear=${onChange}
        @search=${onSearch}
        >${props.slot}</dy-form-item
      >
    `;
  };

  #renderItems = (items: FormItemProps<T> | FormItemProps<T>[]) => {
    if (Array.isArray(items)) {
      return html`
        <dy-form-item-inline-group>${items.map((item) => this.#renderItem(item))}</dy-form-item-inline-group>
      `;
    } else {
      return this.#renderItem(items);
    }
  };

  #setStateInitValue = (props: FormItemProps<T>) => {
    const { data } = this.state;
    const { field } = props;
    const initValue = props.getInitValue?.(data) ?? readProp(this.data || {}, field);
    if (Array.isArray(field)) {
      readProp(data!, field.slice(0, field.length - 1))[field.at(-1)!] = initValue;
    } else {
      data[field] = initValue;
    }
  };

  #deps = new Map<string, Set<FormItemProps<T>>>();
  #onItemChange = ({ detail: { name } }: CustomEvent<{ name: string }>) => {
    this.#deps.get(name)?.forEach((props) => {
      this.#setStateInitValue(props);
      this.update();
      this.#onOptionsChange(props, '');
    });
  };

  #forEachFormItems = (process: (props: FormItemProps<T>) => void) => {
    const each = (items: FormItemProps<T> | FormItemProps<T>[]) => [items].flat().forEach(process);
    this.formItems?.forEach((item) => {
      if ('group' in item) {
        item.group.forEach(each);
      } else {
        each(item);
      }
    });
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
        ${this.formItems?.map((item) => {
          if ('group' in item) {
            return html`
              <details>
                <summary><dy-use .element=${icons.right}></dy-use>${item.label}</summary>
                ${item.group.map((item) => this.#renderItems(item))}
              </details>
            `;
          }
          return this.#renderItems(item);
        })}
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
