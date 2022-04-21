import { customElement, property } from '@mantou/gem/lib/decorators';
import { html, svg } from '@mantou/gem/lib/element';

import { theme } from '../lib/theme';

import { DuoyunChartBaseElement } from './base/chart';
import { ChartTooltip, DataItem } from './chart-tooltip';

export interface Sequence {
  label: string;
  values: (number | null)[];
}

/**
 * @customElement dy-bar-chart
 */
@customElement('dy-bar-chart')
export class DuoyunBarChartElement extends DuoyunChartBaseElement {
  @property series?: string[];
  @property gutter = 0;
  @property stack = false;
  @property sequences?: Sequence[];

  xAxi = {
    formatter: (v: number | null) => this.series?.[Number(v) - 1] || '',
  };

  #stackSequences?: number[][];

  onMouseMove = (index: number, evt: MouseEvent, sort: boolean) => {
    let values: DataItem[] | undefined = this.sequences?.map(({ values, label }, i) => {
      return {
        label,
        value: this.yAxi?.formatter?.(values[index], 0) || String(values[index]),
        color: this.colors[i],
        originValue: values[index],
      };
    });
    if (this.stack) {
      values = values?.reverse();
    }
    if (this.tooltip?.filter) {
      values = values?.filter(this.tooltip.filter);
    }
    if (sort) {
      values = values?.sort((a, b) => {
        const an = Number(a.originValue);
        const bn = Number(b.originValue);
        if (isNaN(an)) return 1;
        if (isNaN(bn)) return -1;
        return an > bn ? -1 : 1;
      });
    }
    ChartTooltip.open(evt.x, evt.y, {
      render: this.tooltip?.render,
      xValue: index,
      title: this.tooltip?.titleFormatter?.(this.series![index]) || String(this.series![index]),
      values: values,
    });
  };

  onMouseOut = () => {
    ChartTooltip.close();
  };

  willMount = () => {
    this.memo(
      () => {
        if (!this.contentRect.width) return;
        if (!this.sequences?.length) return;
        if (!this.series?.length) return;
        const seqs = this.sequences.map((e) => e.values);
        this.#stackSequences = seqs.map((_, index) => this.mergeNumberValues(seqs.slice(0, index + 1))!);
        const xMin = 0;
        const xMax = this.series.length;
        let yMin = Infinity;
        let yMax = -Infinity;
        (this.stack ? this.#stackSequences : seqs).forEach((values) => {
          values.forEach((y) => {
            yMin = Math.min(yMin, y ?? Infinity);
            yMax = Math.max(yMax, y ?? -Infinity);
          });
        });
        this.xStep = xMax;
        this.initXAxi(xMin, xMax);
        this.initYAxi(yMin, yMax);
        this.initViewBox();
      },
      () => [this.sequences, this.contentRect.width],
    );
  };

  render = () => {
    if (this.loading) return this.renderLoading();
    if (this.noData) return this.renderNotData();
    if (!this.contentRect.width || !this.sequences || !this.series) return html``;
    return html`
      <style>
        .hover:hover {
          fill: ${theme.hoverBackgroundColor};
          opacity: 0.2;
        }
        .bar {
          pointer-events: none;
        }
      </style>
      ${svg`
        <svg aria-hidden="true" part=${
          DuoyunChartBaseElement.chart
        } xmlns="http://www.w3.org/2000/svg" viewBox=${this.viewBox.join(' ')}>
          ${this.renderXAxi({ centerLabel: true })}
          ${this.renderYAxi()}
          ${this.series.map(
            (_value, i, _, width = 1) => svg`
              <rect
                @mousemove=${(evt: MouseEvent) => this.onMouseMove(i, evt, false)}
                @mouseout=${this.onMouseOut}
                @click=${() => this.indexclick(i)}
                class="hover"
                fill="transparent"
                x=${(i + 0.5 - width / 2) / this.xAxiUnit}
                y=${0}
                width=${width / this.xAxiUnit}
                height=${this.stageHeight}
              />
            `,
          )}
          ${this.sequences.map(
            (
              { values },
              index,
              arr,
              total = 0.6,
              width = this.stack ? total : total / arr.length - this.gutter * (arr.length - 1),
              offsetX = this.stack ? 0 : index * (this.gutter + width),
            ) =>
              values.map(
                (
                  value,
                  i,
                  _,
                  height = (value || 0) - this.yAxiMin,
                  offsetY = this.stack
                    ? (this.#stackSequences![index - 1] ? this.#stackSequences![index - 1][i] : 0) - this.yAxiMin
                    : 0,
                ) => svg`
                <rect
                 class="bar"
                  fill=${this.colors[index]}
                  x=${(i + (1 - total) / 2 + offsetX) / this.xAxiUnit}
                  y=${this.stageHeight - (height + offsetY) / this.yAxiUnit}
                  width=${width / this.xAxiUnit}
                  height=${height / this.yAxiUnit}
                />
              `,
              ),
          )}
          ${this.renderMarkLines()}
        </svg>
      `}
    `;
  };
}
