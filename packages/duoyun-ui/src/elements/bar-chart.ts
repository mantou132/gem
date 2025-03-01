import { customElement, property, adoptedStyle, memo } from '@mantou/gem/lib/decorators';
import { css, html, svg } from '@mantou/gem/lib/element';

import { theme } from '../lib/theme';

import { DuoyunChartBaseElement } from './base/chart';
import type { DataItem } from './chart-tooltip';
import { ChartTooltip } from './chart-tooltip';

export interface Sequence {
  label: string;
  values: (number | null)[];
}

const style = css`
  .col:hover .rect {
    fill: ${theme.hoverBackgroundColor};
    opacity: 0.2;
  }
  .bar:hover {
    filter: brightness(1.05);
  }
`;

@customElement('dy-bar-chart')
@adoptedStyle(style)
export class DuoyunBarChartElement extends DuoyunChartBaseElement {
  @property series?: string[];
  @property gutter = 0;
  @property stack = false;
  @property sequences?: Sequence[];

  xAxi = {
    formatter: (v: number | null) => this.series?.[Number(v) - 1] || '',
  };

  #stackSequences?: number[][];

  @memo((i) => [i.sequences, i.contentRect.width, i.aspectRatio])
  #calc = () => {
    if (!this.contentRect.width) return;
    if (!this.sequences?.length) return;
    if (!this.series?.length) return;
    const seqList = this.sequences.map((e) => e.values);
    this.#stackSequences = seqList.map((_, index) => this._mergeNumberValues(seqList.slice(0, index + 1))!);
    const xMin = 0;
    const xMax = this.series.length;
    let yMin = Infinity;
    let yMax = -Infinity;
    (this.stack ? this.#stackSequences : seqList).forEach((values) => {
      values.forEach((y) => {
        yMin = Math.min(yMin, y ?? Infinity);
        yMax = Math.max(yMax, y ?? -Infinity);
      });
    });
    this.xStep = xMax;
    this._initXAxi(xMin, xMax);
    this._initYAxi(yMin, yMax);
    this._initViewBox();
  };

  onMouseMove = (index: number, evt: MouseEvent, sort: boolean, seqIndex = -1) => {
    let tooltipValues: DataItem[] | undefined = this.sequences?.map(({ values, label }, i) => {
      return {
        label,
        value: this.yAxi?.formatter?.(values[index], 0) || String(values[index]),
        color: this.colors[i],
        originValue: values[index],
        highlight: seqIndex === i,
      };
    });
    if (this.stack) {
      tooltipValues = tooltipValues?.reverse();
    }
    if (this.tooltip?.filter) {
      tooltipValues = tooltipValues?.filter(this.tooltip.filter);
    }
    if (sort) {
      tooltipValues = tooltipValues?.sort((a, b) => {
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
      values: tooltipValues,
    });
  };

  onMouseOut = () => {
    ChartTooltip.close();
  };

  render = () => {
    if (this.loading) return this._renderLoading();
    if (this.noData) return this._renderNotData();
    if (!this.contentRect.width || !this.sequences || !this.series) return html``;
    return html`
      ${svg`
        <svg
          aria-hidden="true"
          part=${DuoyunChartBaseElement.chart}
          xmlns="http://www.w3.org/2000/svg"
          viewBox=${this._viewBox.join(' ')}
        >
          ${this._renderXAxi({ centerLabel: true })} ${this._renderYAxi()}
          ${this.series.map(
            (_value, i, _, width = 1) => svg`
              <g class="col" @click=${() => this.indexclick(i)} @pointerout=${this.onMouseOut}>
                <rect
                  @pointermove=${(evt: PointerEvent) => this.onMouseMove(i, evt, false)}
                  class="rect"
                  fill="transparent"
                  x=${(i + 0.5 - width / 2) / this._xAxiUnit}
                  y=${0}
                  width=${width / this._xAxiUnit}
                  height=${this._stageHeight}
                />
                ${this.sequences!.map(
                  (
                    { values },
                    index,
                    sequences,
                    value = values[i],
                    total = 0.6,
                    height = (value || 0) - this._yAxiMin,
                    seqWidth = this.stack ? total : (total - this.gutter * (sequences.length - 1)) / sequences.length,
                    offsetX = this.stack ? 0 : index * (this.gutter + seqWidth),
                    offsetY = this.stack
                      ? (this.#stackSequences![index - 1] ? this.#stackSequences![index - 1][i] : 0) - this._yAxiMin
                      : 0,
                  ) => svg`
                    <rect
                      @pointermove=${(evt: PointerEvent) => this.onMouseMove(i, evt, false, index)}
                      class="bar"
                      fill=${this.colors[index]}
                      x=${(i + (1 - total) / 2 + offsetX) / this._xAxiUnit}
                      y=${this._stageHeight - (height + offsetY) / this._yAxiUnit}
                      width=${seqWidth / this._xAxiUnit}
                      height=${height / this._yAxiUnit}
                    />
                  `,
                )}
              </g>
            `,
          )}
          ${this._renderMarkLines()}
        </svg>
      `}
    `;
  };
}
