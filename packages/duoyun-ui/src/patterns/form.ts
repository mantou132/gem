import { html, GemElement, TemplateResult } from '@mantou/gem/lib/element';
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
  getOptions?: (input: string) => Promise<DuoyunFormItemElement['options']>;
  multiple?: boolean;
  placeholder?: string;
  searchable?: boolean;
  clearable?: boolean;

  required?: boolean;
  rules?: DuoyunFormItemElement['rules'];

  slot?: TemplateResult | HTMLElement | HTMLElement[];

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
      data: Object.keys(detail).reduce((p, c) => {
        const keys = c.split(',');
        if (keys.length === 1) {
          p[c] = detail[c];
        } else {
          const lastKey = keys.pop()!;
          const a = keys.reduce((p, c) => (p[c] ||= {}), p);
          a[lastKey] = detail[c];
        }
        return p;
      }, this.state.data as any),
    });
  };

  #onOptionsChange = async <T>(props: FormItemProps<T>, input: string) => {
    if (!props.getOptions) return;
    const options = (this.state.optionsRecord[String(props.field)] ||= {} as OptionsRecord);
    options.loading = true;
    this.update();
    try {
      options.options = await props.getOptions(input);
    } finally {
      options.loading = false;
      this.update();
    }
  };

  #renderItem = <T>(props: FormItemProps<T>) => {
    const { optionsRecord, data } = this.state;
    const name = String(props.field);
    const onChange = (evt: CustomEvent) => props.type === 'text' && this.#onOptionsChange(props, evt.detail);
    const onSearch = (evt: CustomEvent) => props.type === 'select' && this.#onOptionsChange(props, evt.detail);
    return html`
      <dy-form-item
        ?hidden=${props.isHidden?.(data as unknown as T)}
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
        @change=${onChange}
        @clear=${onChange}
        @search=${onSearch}
        >${props.slot}</dy-form-item
      >
    `;
  };

  #renderItems = <T>(items: FormItemProps<T> | FormItemProps<T>[]) => {
    if (Array.isArray(items)) {
      return html`
        <dy-form-item-inline-group>${items.map((item) => this.#renderItem(item))}</dy-form-item-inline-group>
      `;
    } else {
      return this.#renderItem(items);
    }
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
  }

  render = () => {
    return html`
      <dy-form @change=${this.#onChange} ref=${this.formRef.ref}>
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
