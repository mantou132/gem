// https://spectrum.adobe.com/page/donut-chart/
import { adoptedStyle, customElement, attribute, property } from '@mantou/gem/lib/decorators';
import { html, svg } from '@mantou/gem/lib/element';
import { createCSSSheet, css } from '@mantou/gem/lib/utils';

import { theme } from '../lib/theme';

import { DuoyunChartBaseElement } from './base/chart';
import { ChartTooltip } from './chart-tooltip';

const style = createCSSSheet(css`
  .path {
    stroke: ${theme.backgroundColor};
  }
  .path:hover {
    filter: brightness(1.05);
  }
`);

/**
 * @customElement dy-donut-chart
 */
@customElement('dy-donut-chart')
@adoptedStyle(style)
export class DuoyunDonutChartElement extends DuoyunChartBaseElement {
  @attribute label: string;
  @attribute total: string;

  @property sequences?: { label: string; value: number }[];

  stageWidth = 300;
  stageHeight = 300;

  #outside = 140;
  #inside = 115;
  #paths?: string[];

  #onMouseMove = (evt: MouseEvent, index: number) => {
    if (this.noData || this.loading) return;
    if (this.tooltip?.render) {
      ChartTooltip.open(evt.x, evt.y, {
        render: this.tooltip?.render,
        values: this.sequences!.map(({ label, value }, i) => ({
          highlight: index === i,
          value: this.tooltip?.valueFormatter?.(value) || String(value),
          originValue: value,
          color: this.colors[i],
          label: label,
        })),
      });
    }
  };

  #onMouseOut = () => {
    ChartTooltip.close();
  };

  willMount = () => {
    this.memo(
      () => {
        const total = this.sequences?.reduce((p, c) => p + c.value, 0);
        const accumulateSequences = this.sequences?.map((_, index) =>
          this.sequences!.slice(0, index + 1).reduce((p, c) => p + c.value, 0),
        );
        const thetaList = accumulateSequences?.map((v, index, arr, prev = arr[index - 1] || 0) =>
          [prev, v].map((e) => (e / total!) * 2 * Math.PI),
        );
        this.#paths = thetaList?.map(([start, stop]) => {
          const insideStartPoint = this.polarToCartesian([this.#inside, start]).join(' ');
          const insideStopPoint = this.polarToCartesian([this.#inside, stop]).join(' ');
          const outsideStartPoint = this.polarToCartesian([this.#outside, stop]).join(' ');
          const outsideStopPoint = this.polarToCartesian([this.#outside, start]).join(' ');
          return (
            `M${insideStartPoint}A${this.#inside} ${this.#inside} 0 0 1 ${insideStopPoint}` +
            `L${outsideStartPoint}A${this.#outside} ${this.#outside} 0 0 0 ${outsideStopPoint}`
          );
        });
      },
      () => [this.sequences],
    );
  };

  mounted = () => {
    return this.#onMouseOut;
  };

  render = () => {
    if (!this.contentRect.width) return html``;
    return html`
      ${svg`
        <svg aria-hidden="true" part=${
          DuoyunChartBaseElement.chart
        } xmlns="http://www.w3.org/2000/svg" viewBox="-150 -150 300 300">
          ${this.#paths?.map(
            (d, index) => svg`
              <path
                class="path" 
                @mousemove=${(evt: MouseEvent) => this.#onMouseMove(evt, index)}
                @mouseout=${this.#onMouseOut}
                d=${d}
                fill=${this.colors[index]}
                stroke-width=${this.getSVGPixel(1)}
              />
            `,
          )}
          <text
            x=${0}
            y=${this.label ? -this.getSVGPixel(4) : 0}
            font-size=${this.getSVGPixel(24)}
            font-weight="bold"
            fill="currentColor"
            text-anchor="middle"
            dominant-baseline="middle">
            ${this.total}
          </text>
          <text
            x=${0}
            y=${this.total ? this.getSVGPixel(14) : 0}
            font-size=${this.getSVGPixel(12)}
            fill="currentColor"
            text-anchor="middle"
            dominant-baseline="middle">
            ${this.label}
          </text>
        </svg>
      `}
    `;
  };
}
