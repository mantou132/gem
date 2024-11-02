import type { Emitter } from '@mantou/gem/lib/decorators';
import {
  adoptedStyle,
  customElement,
  globalemitter,
  property,
  boolattribute,
  part,
  emitter,
  shadow,
  memo,
} from '@mantou/gem/lib/decorators';
import type { TemplateResult } from '@mantou/gem/lib/element';
import { css, createState, GemElement, html } from '@mantou/gem/lib/element';
import { styleMap, classMap } from '@mantou/gem/lib/utils';

import { icons } from '../lib/icons';
import { getCascaderDeep, readProp } from '../lib/utils';
import { theme } from '../lib/theme';
import { isNotNullish } from '../lib/types';
import { locale } from '../lib/locale';

import './use';
import './checkbox';

const style = css`
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
  .list.none {
    padding: 0.5em;
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
  .disabled {
    color: ${theme.disabledColor};
  }
  .right {
    width: 1.2em;
  }
`;

export type Option = {
  label: string | number;
  value?: string | number;
  // 全支持不知道如何切换
  /**Only top level */
  disabled?: boolean;
  children?: Option[];
  childrenPlaceholder?: TemplateResult;
};

export type OptionValue = string | number;

function getOptionValue(option: Option) {
  return option.value ?? option.label;
}

function hasChildren(option: Option) {
  return option.children || option.childrenPlaceholder;
}

function getOptionDisplayValue(option: Option) {
  return String(getOptionValue(option));
}

const checkboxStatusToken = Symbol();

enum CheckboxStatus {
  Checked,
  Indeterminate,
}

@customElement('dy-cascader')
@adoptedStyle(style)
@shadow()
export class DuoyunCascaderElement extends GemElement {
  @part static column: string;

  @property options?: Option[];
  @boolattribute fit: boolean;
  @boolattribute multiple: boolean;
  @globalemitter change: Emitter<OptionValue[][] | OptionValue[]>;
  @emitter expand: Emitter<Option>;

  @property value?: OptionValue[][] | OptionValue[];

  #state = createState({
    selected: [] as Option[],
  });

  get #value() {
    if (!this.value) return;
    return (this.multiple ? this.value : [this.value]) as OptionValue[][];
  }

  #deep = 1;

  @memo((i) => [i.options])
  #calcDeep = () => {
    if (!this.options) return;
    this.#deep = getCascaderDeep(this.options, 'children');
    // init state
    if (!this.#state.selected.length) {
      const selected: Option[] = [];
      const firstValue = this.#value?.[0] || [];
      for (let index = 0; index < firstValue.length; index++) {
        const val = firstValue[index];
        const item = (index ? selected[selected.length - 1].children! : this.options!).find(
          (e) => val === getOptionValue(e),
        )!;
        if (item.disabled) break;
        selected.push(item);
      }
      this.#state({ selected });
    }
  };

  #valueObj: any = {};

  @memo((i) => [i.value, i.options])
  #calcObj = () => {
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

      const isAll = item.children?.reduce((p, e) => {
        const k = getOptionDisplayValue(e);
        if (sub[k] === true) {
          return p;
        } else {
          check([...path, key], e);
          if (sub[k] && sub[k][checkboxStatusToken] === CheckboxStatus.Checked) return p;
        }
        return false;
      }, true);
      sub[checkboxStatusToken] = isAll ? CheckboxStatus.Checked : CheckboxStatus.Indeterminate;
    };
    this.options?.forEach((e) => check([], e));
  };

  #onChange = (index: number, item: Option, evt: CustomEvent<boolean>) => {
    evt.stopPropagation();
    const valueClone = structuredClone(this.#valueObj);
    let obj = valueClone;
    // set new value(select part)
    for (let i = 0; i < index; i++) {
      const k = getOptionValue(this.#state.selected[i]);
      if (!obj[k]) obj[k] = {};
      obj = obj[k];
    }

    // set new value(children part)
    const generator = (i: Option): any => {
      if (!i.children?.length) {
        return evt.detail;
      }
      return i.children.reduce((p, c) => {
        const v = generator(c);
        const k = getOptionValue(c);
        if (v === false) {
          delete p[k];
        } else {
          p[k] = generator(c);
        }
        return p;
      }, {} as any);
    };

    obj[getOptionValue(item)] = generator(item);

    // parse obj to array
    const value: OptionValue[][] = [];
    const parse = (o: any, init: OptionValue[]) => {
      const keys = Object.keys(o);
      keys.forEach((key) => {
        if (o[key] === true) {
          value.push([...init, key]);
        }
        parse(o[key], [...init, key]);
      });
    };
    parse(valueClone, []);
    this.change(value);
  };

  #onClick = (level: number, item: Option) => {
    if (item.disabled) return;
    const { selected } = this.#state;
    const clickValue = selected.slice(0, level).concat(item);
    if (selected[level] !== item) {
      this.#state({ selected: clickValue });
      if (hasChildren(item)) {
        this.expand(item);
      }
    }
    if (!this.multiple && !item.children) {
      this.change(clickValue.map((e) => getOptionValue(e)));
    }
  };

  render = () => {
    if (!this.options) return html``;
    const { selected } = this.#state;
    const listStyle = styleMap({ width: this.fit ? `${100 / this.#deep}%` : undefined });
    const contents = [
      this.options,
      ...selected.map((item) => item.children || item.childrenPlaceholder).filter(isNotNullish),
    ];
    return html`
      ${contents.map((list, level) =>
        !Array.isArray(list)
          ? html`<div class="list none">${list}</div>`
          : !list.length
            ? html`<div class="list none">${locale.noData}</div>`
            : html`
                <ul part=${DuoyunCascaderElement.column} class="list" style=${listStyle}>
                  ${list.map(
                    (
                      item,
                      _i,
                      _arr,
                      disabled = level === 0 && item.disabled,
                      status = readProp(
                        this.#valueObj,
                        [...selected.slice(0, level), item].map((e) => getOptionDisplayValue(e)),
                      ),
                    ) => html`
                      <li
                        class=${classMap({ item: true, selected: selected[level] === item })}
                        @click=${() => this.#onClick(level, item)}
                      >
                        ${this.multiple
                          ? html`
                              <dy-checkbox
                                class="checkbox"
                                @change=${(evt: CustomEvent<boolean>) => this.#onChange(level, item, evt)}
                                ?disabled=${disabled}
                                ?checked=${status === true || status?.[checkboxStatusToken] === CheckboxStatus.Checked}
                                ?indeterminate=${status !== true &&
                                status?.[checkboxStatusToken] === CheckboxStatus.Indeterminate}
                              ></dy-checkbox>
                            `
                          : ''}
                        <span class=${classMap({ label: true, disabled })}>${getOptionDisplayValue(item)}</span>
                        <dy-use
                          class=${classMap({ right: true, disabled })}
                          .element=${hasChildren(item) && icons.right}
                        ></dy-use>
                      </li>
                    `,
                  )}
                </ul>
              `,
      )}
    `;
  };
}
