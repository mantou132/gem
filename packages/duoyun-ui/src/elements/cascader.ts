import {
  adoptedStyle,
  customElement,
  globalemitter,
  Emitter,
  property,
  boolattribute,
  part,
  emitter,
} from '@mantou/gem/lib/decorators';
import { GemElement, html, TemplateResult } from '@mantou/gem/lib/element';
import { createCSSSheet, css, styleMap, classMap } from '@mantou/gem/lib/utils';

import { icons } from '../lib/icons';
import { structuredClone, getCascaderDeep, readProp } from '../lib/utils';
import { theme } from '../lib/theme';
import { isNotNullish } from '../lib/types';

import './use';
import './checkbox';

const style = createCSSSheet(css`
  :host(:where(:not([hidden]))) {
    display: flex;
    align-items: stretch;
  }
  .list {
    box-sizing: border-box;
    margin: 0;
    padding: 0.2em 0;
    width: 12em;
    overflow: auto;
  }
  .list + .list {
    border-inline-start: 1px solid ${theme.borderColor};
  }
  .item {
    display: flex;
    align-items: center;
    gap: 0.5em;
    line-height: 1.6;
    padding: 0.3em 0.3em 0.3em 0.6em;
  }
  .item:hover,
  .item.selected {
    background-color: ${theme.lightBackgroundColor};
  }
  .checkbox {
    margin-inline-start: 0.2em;
  }
  .label {
    cursor: default;
    flex-grow: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .right {
    width: 1.2em;
  }
`);

export type Option = {
  label: string | number;
  value?: string | number;
  children?: Option[];
  childrenPlaceholder?: TemplateResult;
};

export type OptionValue = string | number;

function getOptionValue(option: Option) {
  return option.value ?? option.label;
}

function getOptionDisplayValue(option: Option) {
  return String(getOptionValue(option));
}

type State = {
  selected: Option[];
};

const token = Symbol();

/**
 * @customElement dy-cascader
 * @attr fit
 * @attr multiple
 * @fires change
 * @fires expand
 */
@customElement('dy-cascader')
@adoptedStyle(style)
export class DuoyunCascaderElement extends GemElement<State> {
  @part static column: string;

  @property options?: Option[];
  @boolattribute fit: boolean;
  @boolattribute multiple: boolean;
  @globalemitter change: Emitter<OptionValue[][] | OptionValue[]>;
  @emitter expand: Emitter<Option>;

  @property value?: OptionValue[][] | OptionValue[];

  state: State = {
    selected: [],
  };

  get #value() {
    if (!this.value) return;
    return (this.multiple ? this.value : [this.value]) as OptionValue[][];
  }

  #deep = 1;
  #valueObj: any = {};

  #onChange = (index: number, item: Option, evt: CustomEvent<boolean>) => {
    evt.stopPropagation();
    const valueClone = structuredClone(this.#valueObj);
    let obj = valueClone;
    // set new value(select part)
    for (let i = 0; i < index; i++) {
      const k = getOptionValue(this.state.selected[i]);
      if (!obj[k]) obj[k] = {};
      obj = obj[k];
    }

    // set new value(children part)
    const generator = (item: Option): any =>
      item.children
        ? item.children.reduce((p, c) => {
            const v = generator(c);
            const k = getOptionValue(c);
            if (v === false) {
              delete p[k];
            } else {
              p[k] = generator(c);
            }
            return p;
          }, {} as any)
        : evt.detail;

    obj[getOptionValue(item)] = generator(item);

    // parse obj to array
    const value: OptionValue[][] = [];
    const parse = (obj: any, init: OptionValue[]) => {
      const keys = Object.keys(obj);
      keys.forEach((key) => {
        if (obj[key] === true) {
          value.push([...init, key]);
        }
        parse(obj[key], [...init, key]);
      });
    };
    parse(valueClone, []);
    this.change(value);
  };

  #onClick = (index: number, item: Option) => {
    const { selected } = this.state;
    const clickValue = selected.slice(0, index).concat(item);
    if (selected[index] !== item) {
      this.setState({ selected: clickValue });
      if (item.children || item.childrenPlaceholder) {
        this.expand(item);
      }
    }
    if (!this.multiple && !item.children) {
      this.change(clickValue.map((e) => getOptionValue(e)));
    }
  };

  willMount = () => {
    this.memo(
      () => {
        if (!this.options) return;
        this.#deep = getCascaderDeep(this.options, 'children');
        // init state
        if (!this.state.selected.length) {
          const selected: Option[] = [];
          this.#value?.[0]?.forEach((val, index) => {
            const item = (index ? selected[selected.length - 1].children! : this.options!).find(
              (e) => val === getOptionValue(e),
            )!;
            selected.push(item);
          });
          this.setState({ selected });
        }
      },
      () => [this.options],
    );
    this.memo(
      () => {
        // generator obj via value(array)
        this.#valueObj =
          this.#value?.reduce((p, value) => {
            value.reduce((pp, s, index, arr) => {
              if (index === arr.length - 1) {
                pp[s] = true;
                return pp;
              } else {
                return (pp[s] = pp[s] || {});
              }
            }, p);
            return p;
          }, {} as any) || {};

        // append check status to obj via value(array)
        const check = (path: string[], item: Option) => {
          const key = getOptionDisplayValue(item);
          const sub = readProp(this.#valueObj, [...path, key]);
          if (sub === true || !sub) return;
          const keys = Object.keys(sub);
          if (!keys.length) sub[token] = -1;

          sub[token] = item.children?.reduce((p, e) => {
            const k = getOptionDisplayValue(e);
            if (sub[k] === true) {
              return p;
            } else {
              check([...path, key], e);
              if (sub[k] && sub[k][token] === 1) return p;
            }
            return false;
          }, true)
            ? 1
            : 0;
        };
        this.options?.forEach((e) => check([], e));
      },
      () => [this.value],
    );
  };

  render = () => {
    if (!this.options) return html``;
    const { selected } = this.state;
    const listStyle = styleMap({ width: this.fit ? `${100 / this.#deep}%` : undefined });
    return html`
      ${[this.options, ...selected.map((e) => e.children || e.childrenPlaceholder).filter(isNotNullish)].map(
        (list, index) =>
          Array.isArray(list)
            ? html`
                <ul part=${DuoyunCascaderElement.column} class="list" style=${listStyle}>
                  ${list.map(
                    (
                      item,
                      _i,
                      _arr,
                      status = readProp(
                        this.#valueObj,
                        [...selected.slice(0, index), item].map((e) => getOptionDisplayValue(e)),
                      ),
                    ) => html`
                      <li
                        class=${classMap({ item: true, selected: selected[index] === item })}
                        @click=${() => this.#onClick(index, item)}
                      >
                        ${this.multiple
                          ? html`
                              <dy-checkbox
                                class="checkbox"
                                @change=${(evt: CustomEvent<boolean>) => this.#onChange(index, item, evt)}
                                ?checked=${status === true || status?.[token] === 1}
                                ?indeterminate=${status !== true && status?.[token] === 0}
                              ></dy-checkbox>
                            `
                          : ''}
                        <span class="label">${getOptionDisplayValue(item)}</span>
                        <dy-use class="right" .element=${item.children && icons.right}></dy-use>
                      </li>
                    `,
                  )}
                </ul>
              `
            : html`<div class="list">${list}</div>`,
      )}
    `;
  };
}
