import type { Emitter } from '@mantou/gem/lib/decorators';
import { adoptedStyle, aria, customElement, emitter, mounted, property } from '@mantou/gem/lib/decorators';
import { css, html } from '@mantou/gem/lib/element';
import { addListener, classMap, styleMap } from '@mantou/gem/lib/utils';

import { commonColors } from '../lib/color';
import { theme } from '../lib/theme';
import { DuoyunScrollBaseElement } from './base/scroll';

import './tooltip';

const style = css`
  :host(:where(:not([hidden]))) {
    --color: initial;
    display: flex;
    gap: 1em;
    align-items: center;
    font-size: 0.875em;
  }
  .item {
    cursor: default;
    display: flex;
    align-items: baseline;
    gap: 4px;
    color: var(--color);
    white-space: nowrap;
  }
  .item.unselect {
    --color: ${theme.disabledColor};
  }
  .item span {
    line-height: 1;
    width: 0.8em;
    height: 0.6em;
    border-radius: ${theme.smallRound};
    background-color: currentColor;
  }
`;

export interface Legend {
  label: string;
  value?: string;
  tooltip?: string;
}

function getValue(legend: Legend) {
  return legend.value ?? legend.label;
}

@customElement('dy-legend')
@adoptedStyle(style)
@aria({ ariaHidden: 'true' })
export class DuoyunLegendElement extends DuoyunScrollBaseElement {
  @property colors = commonColors;
  @property legends?: Legend[] = [];
  @property value?: string[];
  @emitter change: Emitter<string[]>;

  get #currentValueSet() {
    return new Set(this.value ?? this.legends?.map((legend) => getValue(legend)));
  }

  #onWheel = (evt: WheelEvent) => {
    this.scrollBy(Math.sign(evt.deltaY) * 30, 0);
  };

  #onChange = (currentValue: Set<string>, value: string, exclude = false) => {
    const total = this.legends!.length;
    if (total === 1) return;
    if (currentValue.size === total) {
      return this.change(exclude ? [...currentValue].filter((e) => e !== value) : [value]);
    }
    if (currentValue.has(value)) {
      if (currentValue.size === 1) {
        return this.change(this.legends!.map((legend) => getValue(legend)));
      } else {
        return this.change([...currentValue].filter((e) => e !== value));
      }
    }
    return this.change([...currentValue, value]);
  };

  @mounted()
  #init = () => addListener(this, 'wheel', this.#onWheel);

  render = () => {
    const valueSet = this.#currentValueSet;
    return html`
      ${this.legends?.map(
        (legend, index) => html`
          <dy-tooltip .content=${legend.tooltip}>
            <div
              class=${classMap({ item: true, unselect: !valueSet.has(getValue(legend)) })}
              @click=${(evt: MouseEvent) => this.#onChange(valueSet, getValue(legend), evt.metaKey || evt.ctrlKey)}
            >
              <span style=${styleMap({ color: `var(--color, ${this.colors[index % this.colors.length]})` })}></span>
              ${legend.label}
            </div>
          </dy-tooltip>
        `,
      )}
    `;
  };
}
