// https://spectrum.adobe.com/page/scatter-plot/
import { adoptedStyle, customElement, memo, property, unmounted } from '@mantou/gem/lib/decorators';
import { css, html, svg } from '@mantou/gem/lib/element';
import { classMap } from '@mantou/gem/lib/utils';

import { isNullish } from '../lib/types';

import { DuoyunChartBaseElement } from './base/chart';
import type { Sequence } from './area-chart';
import type { Data } from './chart-tooltip';
import { ChartTooltip } from './chart-tooltip';

const style = css`
  .symbol {
    opacity: 0.8;
  }
  .symbol:hover {
    opacity: 1;
    transform-box: fill-box;
    transform-origin: center;
    transform: scale(1.2);
  }
  .disabled {
    pointer-events: none;
  }
`;

@customElement('dy-scatter-chart')
@adoptedStyle(style)
export class DuoyunScatterChartElement extends DuoyunChartBaseElement {
  @property sequences?: Sequence[];

  #symbolSequences: (number[] | undefined)[][] = [];

  @memo((i) => [i.sequences, i.contentRect.width, i.aspectRatio])
  #calc = () => {
    if (!this.contentRect.width) return;
    if (!this.sequences?.length) return;
    let xMin = Infinity;
    let xMax = -Infinity;
    let yMin = Infinity;
    let yMax = -Infinity;
    this.sequences.forEach(({ values }) => {
      values.forEach(([x, y]) => {
        if (!isNullish(x)) {
          xMin = Math.min(xMin, x);
          xMax = Math.max(xMax, x);
        }
        if (!isNullish(y)) {
          yMin = Math.min(yMin, y);
          yMax = Math.max(yMax, y);
        }
      });
    });
    this._initXAxi(xMin, xMax);
    this._initYAxi(yMin, yMax);
    this._initViewBox();

    this.#symbolSequences = this.sequences.map(({ values }) => {
      return values.map(([x, y]) => {
        return isNullish(x) || isNullish(y) ? undefined : this._getStagePoint([x, y]);
      });
    });
  };

  #tooltipRender = (data: Data) => {
    return html`${data.xValue},${data.values![0].value}`;
  };

  #onMouseMove = (evt: MouseEvent, index: number, point: number[]) => {
    if (this.noData || this.loading) return;
    ChartTooltip.open(evt.x, evt.y, {
      render: this.tooltip?.render || this.#tooltipRender,
      xValue: point[0],
      values: [
        {
          value: this.tooltip?.valueFormatter?.(point[1]) || this.yAxi?.formatter?.(point[1], 0) || String(point[1]),
          originValue: point[1],
          color: this.colors[index],
          label: this.sequences![index].label,
        },
      ],
    });
  };

  @unmounted()
  #onMouseOut = () => {
    ChartTooltip.close();
  };

  render = () => {
    if (this.loading) return this._renderLoading();
    if (this.noData) return this._renderNotData();
    if (!this.contentRect.width || !this.sequences) return html``;
    return svg`
      <svg
        aria-hidden="true"
        part=${DuoyunChartBaseElement.chart}
        xmlns="http://www.w3.org/2000/svg"
        viewBox=${this._viewBox.join(' ')}
      >
        ${this._renderXAxi({ grid: true })} ${this._renderYAxi()}
        ${this.sequences.map(({ label, value, values }, index) =>
          this.#symbolSequences[index].map((point, pos) =>
            point
              ? svg`
                  <circle
                    @mousemove=${(evt: MouseEvent) => this.#onMouseMove(evt, index, values[pos] as number[])}
                    @mouseout=${this.#onMouseOut}
                    class=${classMap({
                      symbol: true,
                      disabled: !!this._filtersSet.size && !this._filtersSet.has(value ?? label),
                    })}
                    fill=${this.colors[index]}
                    r=${this._getSVGPixel(5)}
                    cx=${point[0]}
                    cy=${point[1]}
                  />
                `
              : '',
          ),
        )}
      </svg>
    `;
  };
}
