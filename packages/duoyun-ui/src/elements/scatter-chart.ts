// https://spectrum.adobe.com/page/scatter-plot/
import { customElement, property } from '@mantou/gem/lib/decorators';
import { html, svg } from '@mantou/gem/lib/element';
import { classMap } from '@mantou/gem/lib/utils';

import { isNullish } from '../lib/types';

import { DuoyunChartBaseElement } from './base/chart';
import { Sequence } from './area-chart';
import { ChartTooltip } from './chart-tooltip';

/**
 * @customElement dy-scatter-chart
 */
@customElement('dy-scatter-chart')
export class DuoyunScatterChartElement extends DuoyunChartBaseElement {
  @property sequences?: Sequence[];

  #symbolSequences: number[][][] = [];

  #onMouseMove = (evt: MouseEvent, index: number, point: number[]) => {
    if (this.noData || this.loading) return;
    if (this.tooltip?.render) {
      ChartTooltip.open(evt.x, evt.y, {
        render: this.tooltip?.render,
        title: this.tooltip?.formatter?.(point[0]) || String(point[0]),
        xValue: point[0],
        values: [
          {
            value: this.yAxi?.formatter?.(point[1], 0) || String(point[1]),
            originValue: point[1],
            color: this.colors[index],
            label: this.sequences![index].label,
          },
        ],
      });
    }
  };

  #onMouseOut = () => {
    ChartTooltip.close();
  };

  willMount = () => {
    this.memo(
      () => {
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
        this.initXAxi(xMin, xMax);
        this.initYAxi(yMin, yMax);
        this.initViewBox();

        this.#symbolSequences = [];
        this.sequences.forEach(({ values }) => {
          const dots: number[][] = [];
          values.forEach(([x, y]) => {
            if (!isNullish(x) && !isNullish(y)) {
              dots.push(this.getStagePoint([x, y]));
            }
          });
          this.#symbolSequences.push(dots);
        });
      },
      () => [this.sequences, this.contentRect.width],
    );
  };

  mounted = () => {
    return this.#onMouseOut;
  };

  render = () => {
    if (this.loading) return this.renderLoading();
    if (this.noData) return this.renderNotData();
    if (!this.contentRect.width || !this.sequences) return html``;
    return html`
      <style>
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
      </style>
      ${svg`
        <svg aria-hidden="true" part="svg" xmlns="http://www.w3.org/2000/svg" viewBox=${this.viewBox.join(' ')}>
          ${this.renderXAxi({ grid: true })}
          ${this.renderYAxi()}
          ${this.sequences.map(({ label, value }, index) =>
            this.#symbolSequences[index].map((point) =>
              point
                ? svg`
                    <circle
                      @mousemove=${(evt: MouseEvent) => this.#onMouseMove(evt, index, point)}
                      @mouseout=${this.#onMouseOut}
                      class=${classMap({
                        symbol: true,
                        disabled: !!this.filtersSet.size && !this.filtersSet.has(value ?? label),
                      })}
                      fill=${this.colors[index]}
                      r=${this.getSVGPixel(5)}
                      cx=${point[0]}
                      cy=${point[1]}
                    />
                  `
                : '',
            ),
          )}
        </svg>
      `}
    `;
  };
}
