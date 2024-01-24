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
  multiple?: boolean;
  placeholder?: string;
  searchable?: boolean;
  clearable?: boolean;

  required?: boolean;
  rules?: DuoyunFormItemElement['rules'];

  slot?: TemplateResult | HTMLElement | HTMLElement[];
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
    cursor: default;
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

/**
 * @customElement dy-pat-form
 */
@customElement('dy-pat-form')
@adoptedStyle(blockContainer)
@adoptedStyle(focusStyle)
@adoptedStyle(style)
export class DyPatFormElement<T = Record<string, unknown>> extends GemElement<T> {
  @refobject formRef: RefObject<DuoyunFormElement>;

  @property data?: T;
  @property formItems?: FormItem<T>[];

  state: T = {} as T;

  #onChange = ({ detail }: CustomEvent<any>) => {
    this.setState(
      Object.keys(detail).reduce((p, c) => {
        const keys = c.split(',');
        if (keys.length === 1) {
          p[c] = detail[c];
        } else {
          const lastKey = keys.pop()!;
          const a = keys.reduce((p, c) => (p[c] ||= {}), p);
          a[lastKey] = detail[c];
        }
        return p;
      }, this.state as any),
    );
  };

  #renderItem = <T>({
    label,
    field,
    type,
    clearable,
    multiple,
    placeholder,
    required,
    rules,
    options,
    searchable,
    slot,
  }: FormItemProps<T>) => {
    return html`
      <dy-form-item
        .label=${label}
        .value=${readProp(this.state!, field)}
        .name=${String(field)}
        .type=${type}
        .placeholder=${placeholder || ''}
        .rules=${rules}
        .options=${options}
        ?multiple=${multiple}
        ?clearable=${clearable}
        ?searchable=${searchable}
        ?required=${required}
        >${slot}</dy-form-item
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
          this.state = structuredClone(this.data);
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
      prepareClose: (ele) => options.prepareClose?.(ele.state),
      prepareOk: async (ele) => {
        const valid = await ele.valid();
        if (!valid) throw null;
        await waitLoading(options.prepareOk?.(ele.state));
        await DuoyunWaitElement.instance?.removed;
      },
    })
    .then((ele) => ele.state)
    .catch((ele) => {
      throw ele.state;
    })
    .finally(() => {
      if (options.query) {
        query.delete(options.query[0]);
        history.replace({ query });
      }
    });
}
