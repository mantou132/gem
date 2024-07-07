// https://spectrum.adobe.com/page/meter/
import { adoptedStyle, customElement, attribute, property, numattribute, aria } from '@mantou/gem/lib/decorators';
import { GemElement, html, TemplateResult } from '@mantou/gem/lib/element';
import { createCSSSheet, css, styleMap } from '@mantou/gem/lib/utils';

import { theme, getSemanticColor } from '../lib/theme';
import type { StringList } from '../lib/types';

const style = createCSSSheet(css`
  :host(:where(:not([hidden]))) {
    font-size: 0.875em;
    width: 15em;
    display: inline-flex;
    flex-direction: column;
    gap: 0.5em;
  }
  .text {
    font-size: 0.85em;
    display: flex;
    justify-content: space-between;
  }
  :host([layout='flat']) {
    flex-direction: row;
    align-items: center;
  }
  :host([layout='flat']) .text {
    display: contents;
  }
  :host([layout='flat']) .value-label {
    order: 10;
  }
  .track {
    flex-grow: 1;
    border-radius: 10em;
    height: 0.35em;
    background: ${theme.hoverBackgroundColor};
  }
  .value {
    border-radius: inherit;
    height: 100%;
    background: currentColor;
    transition: width 0.3s;
  }
`);

/**
 * @customElement dy-meter
 */
@customElement('dy-meter')
@adoptedStyle(style)
@aria({ role: 'meter' })
export class DuoyunMeterElement extends GemElement {
  /**range: 0-100 */
  @numattribute value: number;
  @numattribute max: number;
  @numattribute min: number;
  @attribute color: StringList<'positive' | 'informative' | 'negative' | 'notice'>;
  @attribute layout: 'stack' | 'flat';

  @property label?: string | TemplateResult;
  @property valueLabel?: 'percentage' | TemplateResult;
  @property calculateColor = () => {
    const progress = this.#progress;
    if (progress > 0.9) return theme.negativeColor;
    if (progress > 0.7) return theme.noticeColor;
    return theme.informativeColor;
  };

  get #max() {
    return this.hasAttribute('max') ? this.max : 100;
  }

  get #progress() {
    return this.value / (this.#max - this.min);
  }

  get #color() {
    return getSemanticColor(this.color) || this.color || this.calculateColor();
  }

  get #percentage() {
    return `${Math.round(this.#progress * 100)}%`;
  }

  get #valueLabel() {
    switch (this.valueLabel) {
      case 'percentage':
        return this.#percentage;
      default:
        return this.valueLabel;
    }
  }

  constructor() {
    super();
    this.effect(() => {
      this.internals.ariaValueMin = String(this.min);
      this.internals.ariaValueMax = String(this.#max);
    });
  }

  render = () => {
    return html`
      <div class="text">
        <span class="label">${this.label}</span>
        <span class="value-label">${this.#valueLabel}</span>
      </div>
      <div class="track">
        <div class="value" style=${styleMap({ width: this.#percentage, color: this.#color })}></div>
      </div>
    `;
  };
}
