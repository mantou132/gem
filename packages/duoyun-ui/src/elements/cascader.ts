import {
  adoptedStyle,
  customElement,
  globalemitter,
  Emitter,
  property,
  boolattribute,
} from '@mantou/gem/lib/decorators';
import { GemElement, html } from '@mantou/gem/lib/element';
import { createCSSSheet, css, styleMap, classMap } from '@mantou/gem/lib/utils';

import { icons } from '../lib/icons';
import { structuredClone, getCascaderDeep, readProp } from '../lib/utils';
import { theme } from '../lib/theme';
import { isNotNullish } from '../lib/types';

import '@mantou/gem/elements/use';
import './checkbox';

const style = createCSSSheet(css`
  :host {
    display: flex;
    align-items: stretch;
  }
  .list {
    box-sizing: border-box;
    margin: 0;
    padding: 0.2em 0;
    width: 10em;
    overflow: auto;
  }
  .list + .list {
    border-inline-start: 1px solid ${theme.borderColor};
  }
  .item {
    display: flex;
    align-items: center;
    gap: 0.5em;
    line-height: 1.8;
    padding-inline-start: 0.5em;
  }
  .item:hover,
  .item.selected {
    background-color: ${theme.lightBackgroundColor};
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
};

type State = {
  selected: Option[];
};

const token = Symbol();

/**
 * @customElement dy-cascader
 * @attr fit
 * @attr multiple
 */
@customElement('dy-cascader')
@adoptedStyle(style)
export class DuoyunCascaderElement extends GemElement<State> {
  @property options: Option[];
  @boolattribute fit: boolean;
  @boolattribute multiple: boolean;
  @globalemitter change: Emitter<(string | number)[][] | (string | number)[]>;

  @property value?: (string | number)[][] | (string | number)[];

  state: State = {
    selected: [],
  };

  get #value() {
    if (!this.value) return;
    return (this.multiple ? this.value : [this.value]) as (string | number)[][];
  }

  #deep = 1;
  #valueObj: any = {};

  #onChange = (index: number, item: Option, evt: CustomEvent<boolean>) => {
    evt.stopPropagation();
    const valueClone = structuredClone(this.#valueObj);
    let obj = valueClone;
    // set new value(select part)
    for (let i = 0; i < index; i++) {
      const { value, label } = this.state.selected[i];
      const k = value ?? label;
      if (!obj[k]) obj[k] = {};
      obj = obj[k];
    }

    // set new value(children part)
    const generator = (item: Option): any =>
      item.children
        ? item.children.reduce((p, c) => {
            const v = generator(c);
            const k = c.value ?? c.label;
            if (v === false) {
              delete p[k];
            } else {
              p[k] = generator(c);
            }
            return p;
          }, {} as any)
        : evt.detail;

    obj[item.value ?? item.label] = generator(item);

    // paser obj to array
    const value: (string | number)[][] = [];
    const parse = (obj: any, init: (string | number)[]) => {
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
    }
    if (!this.multiple) {
      this.change(clickValue.map((e) => e.value ?? e.label));
    }
  };

  willMount = () => {
    this.memo(
      () => {
        this.#deep = getCascaderDeep(this.options, 'children');
        // init state
        if (!this.state.selected.length) {
          const selected: Option[] = [];
          this.#value?.[0]?.forEach((val, index) => {
            const item = (index ? selected[selected.length - 1].children! : this.options).find(
              (e) => val === (e.value ?? e.label),
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
          const key = String(item.value ?? item.label);
          const sub = readProp(this.#valueObj, [...path, key]);
          if (sub === true || !sub) return;
          const keys = Object.keys(sub);
          if (!keys.length) sub[token] = -1;

          sub[token] = item.children?.every((e) => {
            const k = String(e.value ?? e.label);
            if (sub[k] === true) {
              return true;
            } else {
              check([...path, key], e);
              if (sub[k] && sub[k][token] === 1) return true;
            }
          })
            ? 1
            : 0;
        };
        this.options.forEach((e) => check([], e));
      },
      () => [this.value],
    );
  };

  render = () => {
    const { selected } = this.state;
    const listStyle = styleMap({ width: this.fit ? `${100 / this.#deep}%` : undefined });
    return html`
      ${[this.options, ...selected.map((e) => e.children).filter(isNotNullish)].map(
        (list, index) =>
          html`
            <ul part="column" class="list" style=${listStyle}>
              ${list.map(
                (
                  item,
                  _i,
                  _arr,
                  status = readProp(
                    this.#valueObj,
                    [...selected.slice(0, index), item].map((e) => String(e.value ?? e.label)),
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
                    <span class="label">${item.value ?? item.label}</span>
                    <gem-use class="right" .element=${item.children && icons.right}></gem-use>
                  </li>
                `,
              )}
            </ul>
          `,
      )}
    `;
  };
}
