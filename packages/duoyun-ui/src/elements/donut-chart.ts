// https://spectrum.adobe.com/page/donut-chart/
import { adoptedStyle, attribute, customElement, memo, property, unmounted } from '@mantou/gem/lib/decorators';
import { css, html, svg } from '@mantou/gem/lib/element';

import { theme } from '../lib/theme';
import { DuoyunChartBaseElement } from './base/chart';
import type { Data } from './chart-tooltip';
import { ChartTooltip } from './chart-tooltip';

const style = css`
  .path {
    stroke: ${theme.backgroundColor};
  }
  .path:hover {
    filter: brightness(1.05);
  }
`;

@customElement('dy-donut-chart')
@adoptedStyle(style)
export class DuoyunDonutChartElement extends DuoyunChartBaseElement {
  @attribute label: string;
  @attribute total: string;

  @property aspectRatio = 1;
  @property sequences?: { label: string; value: number }[];

  _stageWidth = 300;

  #outside = 140;
  #inside = 115;

  #paths?: string[];

  @memo((i) => [i.sequences])
  #calc = () => {
    const total = this.sequences?.reduce((p, c) => p + c.value, 0);
    const accumulateSequences = this.sequences?.map((_, index) =>
      this.sequences!.slice(0, index + 1).reduce((p, c) => p + c.value, 0),
    );
    const thetaList = accumulateSequences?.map((v, index, arr, prev = arr[index - 1] || 0) =>
      [prev, v].map((e) => (e / total!) * 2 * Math.PI),
    );
    this.#paths = thetaList?.map(([start, stop]) => {
      const insideStartPoint = this._polarToCartesian([this.#inside, start]).join(' ');
      const insideStopPoint = this._polarToCartesian([this.#inside, stop]).join(' ');
      const outsideStartPoint = this._polarToCartesian([this.#outside, stop]).join(' ');
      const outsideStopPoint = this._polarToCartesian([this.#outside, start]).join(' ');
      return (
        `M${insideStartPoint}A${this.#inside} ${this.#inside} 0 0 1 ${insideStopPoint}` +
        `L${outsideStartPoint}A${this.#outside} ${this.#outside} 0 0 0 ${outsideStopPoint}`
      );
    });
  };

  #tooltipRender = (data: Data) => {
    return html`${data.values![0].label},${data.values![0].value}`;
  };

  #onMouseMove = (evt: MouseEvent, index: number) => {
    if (this.noData || this.loading) return;
    const { label, value } = this.sequences![index];
    ChartTooltip.open(evt.x, evt.y, {
      render: this.tooltip?.render || this.#tooltipRender,
      values: [
        {
          value: this.tooltip?.valueFormatter?.(value) || String(value),
          originValue: value,
          color: this.colors[index],
          label: label,
        },
      ],
    });
  };

  @unmounted()
  #onMouseOut = () => {
    ChartTooltip.close();
  };

  render = () => {
    if (!this.contentRect.width) return html``;
    return html`
      ${svg`
        <svg
          aria-hidden="true"
          part=${DuoyunChartBaseElement.chart}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="-150 -150 300 300"
        >
          ${this.#paths?.map(
            (d, index) => svg`
              <path
                class="path"
                @pointermove=${(evt: PointerEvent) => this.#onMouseMove(evt, index)}
                @pointerout=${this.#onMouseOut}
                @click=${() => this.indexclick(index)}
                d=${d}
                fill=${this.colors[index]}
                stroke-width=${this._getSVGPixel(1)}
              />
            `,
          )}
          <text
            x=${0}
            y=${this.label ? -this._getSVGPixel(4) : 0}
            font-size=${this._getSVGPixel(24)}
            font-weight="bold"
            fill="currentColor"
            text-anchor="middle"
            dominant-baseline="middle"
          >
            ${this.total}
          </text>
          <text
            x=${0}
            y=${this.total ? this._getSVGPixel(14) : 0}
            font-size=${this._getSVGPixel(12)}
            fill="currentColor"
            text-anchor="middle"
            dominant-baseline="middle"
          >
            ${this.label}
          </text>
        </svg>
      `}
    `;
  };
}
