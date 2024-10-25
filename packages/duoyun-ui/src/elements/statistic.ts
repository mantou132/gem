import {
  adoptedStyle,
  customElement,
  attribute,
  boolattribute,
  numattribute,
  property,
  aria,
  shadow,
  slot,
} from '@mantou/gem/lib/decorators';
import { GemElement, html, createCSSSheet } from '@mantou/gem/lib/element';
import { classMap } from '@mantou/gem/lib/utils';

import { parseDuration } from '../lib/time';
import { theme } from '../lib/theme';
import { formatBandwidth, formatDecimal, formatPercentage, formatTraffic, formatCurrency } from '../lib/number';

import './placeholder';
import './use';

const style = createCSSSheet`
  :host(:where(:not([hidden]))) {
    display: block;
    font-size: 0.875em;
    line-height: 1.2;
  }
  .header {
    display: flex;
    justify-content: space-between;
    gap: 1em;
    margin-block-end: 1em;
  }
  .title {
    overflow: hidden;
    flex-shrink: 1;
    white-space: nowrap;
  }
  .icon {
    width: 1em;
    flex-shrink: 0;
  }
  .values {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-weight: bold;
  }
  .value {
    display: flex;
    align-items: baseline;
    gap: 0.3em;
  }
  .number {
    font-size: 2em;
  }
  .positive {
    color: ${theme.positiveColor};
  }
  .negative {
    color: ${theme.negativeColor};
  }
`;

export type StatisticType = 'bandwidth' | 'traffic' | 'decimal' | 'percentage' | 'duration' | 'currency';
export type StatisticNeutral = 'positive' | 'negative';

export const formatFnMap: Record<StatisticType, (n: number) => { number: string; unit: string }> = {
  bandwidth: formatBandwidth,
  traffic: formatTraffic,
  decimal: formatDecimal,
  percentage: formatPercentage,
  currency: formatCurrency,
  duration: parseDuration,
};

@customElement('dy-statistic')
@adoptedStyle(style)
@aria({ role: 'group' })
@shadow()
export class DuoyunStatisticElement extends GemElement {
  @slot static header: string;

  @attribute neutral: StatisticNeutral;
  @attribute type: StatisticType;
  /**@deprecated */
  @attribute text: string;
  @attribute header: string;
  @property icon: string | Element | DocumentFragment;
  @boolattribute loading: boolean;
  @numattribute value: number;
  @numattribute prevValue: number;

  get #neutral() {
    return this.neutral || 'positive';
  }

  get #type() {
    return this.type || 'decimal';
  }

  get #header() {
    return this.header || this.text;
  }

  render = () => {
    const { number, unit } = formatFnMap[this.#type](this.value);

    const diffValue =
      this.prevValue !== 0 && this.value === 0
        ? Infinity
        : Number((((this.value - this.prevValue) / this.prevValue) * 100).toFixed(2));
    const [positive, negative] =
      this.#neutral === 'positive' ? [diffValue > 0, diffValue < 0] : [diffValue < 0, diffValue > 0];

    return html`
      <div class="header">
        <span class="title">
          ${this.loading
            ? html`<dy-placeholder width="5em"></dy-placeholder>`
            : html`<slot name=${DuoyunStatisticElement.header}>${this.#header}</slot>`}
        </span>
        <dy-use class="icon" .element=${this.icon}></dy-use>
      </div>
      <div class="values">
        <div class="value">
          <span class="number">${this.loading ? html`<dy-placeholder width="6em"></dy-placeholder>` : number}</span>
          <span class="unit">${this.loading ? '' : unit}</span>
        </div>
        ${this.loading || !this.hasAttribute('prev-value')
          ? ''
          : html`<span class=${classMap({ positive, negative })}>
              ${isNaN(diffValue) ? '-' : diffValue === Infinity ? '∞' : diffValue}%
            </span>`}
      </div>
    `;
  };
}
