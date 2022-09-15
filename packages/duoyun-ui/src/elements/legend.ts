import { adoptedStyle, customElement, emitter, Emitter, property } from '@mantou/gem/lib/decorators';
import { html } from '@mantou/gem/lib/element';
import { createCSSSheet, css, styleMap, classMap } from '@mantou/gem/lib/utils';

import { theme } from '../lib/theme';
import { commonColors } from '../lib/color';

import { DuoyunScrollBaseElement } from './base/scroll';

import './tooltip';

const style = createCSSSheet(css`
  :host {
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
`);

export interface Legend {
  label: string;
  value?: string;
  tooltip?: string;
}

/**
 * @customElement dy-legend
 */
@customElement('dy-legend')
@adoptedStyle(style)
export class DuoyunLegendElement extends DuoyunScrollBaseElement {
  @property colors = commonColors;
  @property legends?: Legend[] = [];
  @property value?: string[];
  @emitter change: Emitter<string[]>;

  get #currentValueSet() {
    return new Set(this.value ?? this.legends?.map(({ value, label }) => value ?? label));
  }

  constructor() {
    super();
    this.addEventListener('wheel', this.#onWheel);
    this.internals.ariaHidden = 'true';
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
        return this.change(this.legends!.map(({ label, value }) => value ?? label));
      } else {
        return this.change([...currentValue].filter((e) => e !== value));
      }
    }
    return this.change([...currentValue, value]);
  };

  render = () => {
    const currentValue = this.#currentValueSet;
    return html`
      ${this.legends?.map(
        ({ value, label, tooltip }, index) =>
          html`
            <dy-tooltip .content=${tooltip}>
              <div
                class=${classMap({ item: true, unselect: !currentValue.has(value ?? label) })}
                @click=${(e: MouseEvent) => this.#onChange(currentValue, value ?? label, e.metaKey || e.ctrlKey)}
              >
                <span style=${styleMap({ color: `var(--color, ${this.colors[index % this.colors.length]})` })}></span>
                ${label}
              </div>
            </dy-tooltip>
          `,
      )}
    `;
  };
}
