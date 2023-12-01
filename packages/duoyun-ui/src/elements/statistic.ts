import { adoptedStyle, customElement, attribute, boolattribute, numattribute } from '@mantou/gem/lib/decorators';
import { GemElement, html, TemplateResult } from '@mantou/gem/lib/element';
import { createCSSSheet, css, classMap } from '@mantou/gem/lib/utils';

import { parseDuration } from '../lib/time';
import { theme } from '../lib/theme';
import { formatBandwidth, formatDecimal, formatPercentage, formatTraffic, formatCurrency } from '../lib/number';

import './placeholder';

const style = createCSSSheet(css`
  :host(:where(:not([hidden]))) {
    display: block;
    font-size: 0.875em;
    line-height: 1.2;
  }
  .title {
    margin-block-end: 1em;
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
`);

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

/**
 * @customElement dy-statistic
 * @attr loading
 */
@customElement('dy-statistic')
@adoptedStyle(style)
export class DuoyunStatisticElement extends GemElement {
  @attribute neutral: StatisticNeutral;
  @attribute type: StatisticType;
  @attribute text: string | TemplateResult;
  @boolattribute loading: boolean;
  @numattribute value: number;
  @numattribute prevValue: number;

  get #neutral() {
    return this.neutral || 'positive';
  }

  get #type() {
    return this.type || 'decimal';
  }

  constructor() {
    super();
    this.internals.role = 'group';
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
      <div class="title">${this.loading ? html`<dy-placeholder width="5em"></dy-placeholder>` : this.text}</div>
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
