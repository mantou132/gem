import { adoptedStyle, emitter, Emitter, property, state, part } from '@mantou/gem/lib/decorators';
import { html, svg, TemplateResult, GemElementOptions } from '@mantou/gem/lib/element';
import { createCSSSheet, css, randomStr } from '@mantou/gem/lib/utils';

import { theme } from '../../lib/theme';
import { Data, DataItem } from '../chart-tooltip';
import { formatToPrecision, adjustRange } from '../../lib/number';
import { commonColors } from '../../lib/color';

import { DuoyunResizeBaseElement } from './resize';

import '../loading';
import '../empty';

export interface Axi {
  formatter?: (value: number | null, index: number) => string;
}

export interface Tooltip {
  formatter?: (value: number | string | null) => string;
  filter?: (data: DataItem) => boolean;
  render?: (data: Data) => TemplateResult;
}

export interface MarkLine {
  value: number;
  label?: string;
  color?: string;
}

const style = createCSSSheet(css`
  :host {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-size: 0.75em;
  }
  :host(:where(:--loading, [data-loading], :--no-data, [data-nodata])) {
    aspect-ratio: 2 / 1;
  }
  svg {
    display: block;
    overflow: visible;
    /* https://bugs.webkit.org/show_bug.cgi?id=221234 */
    width: 100%;
    user-select: none;
  }
  text {
    cursor: default;
  }
`);

@adoptedStyle(style)
export class DuoyunChartBaseElement<_T = Record<string, unknown>> extends DuoyunResizeBaseElement {
  @part static chart: string;

  @property filters?: string[];
  @property colors = commonColors;
  @property xAxi?: Axi | null;
  @property yAxi?: Axi | null;
  @property yMin?: number;
  @property yMax?: number;
  @property xStep = 6;
  @property yStep = 5;
  // FIXME: rem change bug
  @property tooltip?: Tooltip;
  @property markLines?: MarkLine[];

  @emitter indexclick: Emitter<number>;

  // FIXME: shake
  @state loading: boolean;
  @state noData: boolean;

  constructor(options?: GemElementOptions) {
    super(options);
    this.internals.role = 'img';
    this.memo(
      () => {
        this.filtersSet = new Set(this.filters);
      },
      () => [this.filters],
    );
  }

  stageWidth = 300;
  stageHeight = 150;
  chartId = randomStr();
  filtersSet = new Set<string>();

  // initXAxi
  xAxiMin = 0;
  xAxiMax = 0;
  xAxiUnit = 0;
  xAxiStepUnit = 0;
  xAxiMarks = [0];
  xAxiLabels = [''];
  stateXAxiMarks = [0];
  // initYAxi
  yAxiMin = 0;
  yAxiMax = 0;
  yAxiUnit = 0;
  yAxiStepUnit = 0;
  yAxiMarks = [0];
  yAxiLabels = [''];
  stateYAxiMarks = [0];

  viewBox = [0, 0, 0, 0];

  initXAxi = (xMin: number, xMax: number, adjust = false) => {
    if (xMin === Infinity || xMax === -Infinity) return;
    if (adjust) {
      const [min, max] = adjustRange([xMin, xMax], this.xStep, [1000, 60, 5, 6, 2, 2, 12]);
      this.xAxiMin = min;
      this.xAxiMax = max;
    } else {
      this.xAxiMin = xMin;
      this.xAxiMax = xMax;
    }
    this.xAxiUnit = (this.xAxiMax - this.xAxiMin) / this.stageWidth;
    this.xAxiStepUnit = (this.xAxiMax - this.xAxiMin) / this.xStep;
    this.xAxiMarks = Array.from({ length: this.xStep + 1 }, (_, index) => this.xAxiMin + index * this.xAxiStepUnit);
    this.stateXAxiMarks = this.xAxiMarks.map((_, index) => (this.xAxiStepUnit * index) / this.xAxiUnit);
    this.xAxiLabels = this.xAxiMarks.map((e, i) => this.xAxi?.formatter?.(e, i) ?? String(e));
  };

  initYAxi = (yMin: number, yMax: number) => {
    if (yMin === Infinity || yMax === -Infinity) {
      yMin = 0;
      yMax = 0;
    }
    const markLineValues = (this.markLines || []).map((e) => e.value);
    const [iMin, iMax] = [Math.min(this.yMin || 0, ...markLineValues), Math.max(yMax, ...markLineValues)];
    const [min, max] = this.yMax
      ? [iMin, Math.max(this.yMax, ...markLineValues)]
      : adjustRange([iMin, iMax], this.yStep);
    this.yAxiMin = min;
    this.yAxiMax = max;
    this.yAxiUnit = (this.yAxiMax - this.yAxiMin) / this.stageHeight;
    this.yAxiStepUnit = (this.yAxiMax - 0) / this.yStep;
    this.yAxiMarks = Array.from({ length: this.yStep + 1 }, (_, index) => this.yAxiMin + index * this.yAxiStepUnit);
    this.stateYAxiMarks = this.yAxiMarks.map(
      (_, index, arr) => (this.yAxiStepUnit * (arr.length - 1 - index)) / this.yAxiUnit,
    );
    this.yAxiLabels = this.yAxiMarks.map((e, i) => this.yAxi?.formatter?.(e, i) ?? String(e));
  };

  initViewBox = () => {
    const charUnit = 3;
    const offsetX =
      this.xAxi === null
        ? 3 * -this.getSVGPixel(12)
        : -this.getSVGPixel(12) -
          this.getSVGPixel(8) * Math.ceil(Math.max(...this.yAxiLabels.map((e) => e.length)) / charUnit) * charUnit;
    const offsetY = this.yAxi === null ? 3 * -this.getSVGPixel(12) : -this.getSVGPixel(12) / 2;
    this.viewBox =
      this.xAxi === null && this.yAxi === null
        ? [0, 0, this.stageWidth, this.stageHeight]
        : [
            offsetX,
            offsetY,
            this.stageWidth - offsetX + 3 * this.getSVGPixel(12),
            this.stageHeight - offsetY + 3.5 * this.getSVGPixel(12),
          ];
  };

  genGradientId = (index: number) => `gradient-${this.chartId}-${index}`;

  // ~=
  getSVGPixel = (x = 1) => formatToPrecision(x / (this.contentRect.width / this.stageWidth));

  getStageScale = () => this.contentRect.width / this.viewBox[2];

  // init after
  // from origin data point
  getStagePoint = ([x, y]: number[]) => {
    return [
      formatToPrecision((x - this.xAxiMin) / this.xAxiUnit),
      formatToPrecision(this.stageHeight - (y - this.yAxiMin) / this.yAxiUnit),
    ];
  };

  // from mouse position
  getStagePointFromPosition = ([x, y]: number[]) => {
    const svgScale = this.getStageScale();
    const value = [x / svgScale + this.viewBox[0], y / svgScale + this.viewBox[1]];
    if (value[0] < 0 || value[0] > this.stageWidth || value[1] < 0 || value[1] > this.stageHeight) return;
    return value;
  };

  renderLoading = () => {
    return html`<dy-loading></dy-loading>`;
  };

  renderNotData = () => {
    return html`<dy-empty></dy-empty>`;
  };

  renderXAxi = ({ centerLabel, grid }: { centerLabel?: boolean; grid?: boolean } = {}) => {
    const offset = centerLabel ? 0.5 * (this.xAxiStepUnit / this.xAxiUnit) : 0;
    return this.xAxi !== null
      ? svg`
        <path 
          stroke=${theme.borderColor}
          fill="none"
          stroke-width=${this.getSVGPixel()}
          d=${`M0 ${this.stageHeight}L${(this.xAxiMax - this.xAxiMin) / this.xAxiUnit} ${this.stageHeight}`}>
        </path>
        ${this.xAxiLabels.map(
          (label, index) =>
            svg`
              ${
                grid
                  ? svg`
                      <path
                        stroke=${theme.lightBackgroundColor}
                        fill="none"
                        stroke-width=${this.getSVGPixel()}
                        d=${`M${this.stateXAxiMarks[index]} ${this.stageHeight} L${this.stateXAxiMarks[index]} 0`}>
                      </path>
                    `
                  : ''
              }
              <path 
                stroke=${theme.borderColor}
                fill="none"
                stroke-width=${this.getSVGPixel()}
                d=${`M${this.stateXAxiMarks[index]} ${this.stageHeight} L${this.stateXAxiMarks[index]} ${
                  this.stageHeight + this.getSVGPixel(6)
                }`}>
              </path>
              <text
                x=${this.stateXAxiMarks[index] - offset}
                y=${this.stageHeight + this.getSVGPixel(12)}
                font-size=${this.getSVGPixel(12)}
                fill="currentColor"
                text-anchor="middle"
                dominant-baseline="hanging">
                ${label}
              </text>
            `,
        )}
      `
      : '';
  };

  renderYAxi = () => {
    return this.yAxi !== null
      ? html`
          ${this.stateYAxiMarks.map((_, index) =>
            index !== 0
              ? svg`
                  <path
                    stroke=${theme.lightBackgroundColor}
                    fill="none"
                    stroke-width=${this.getSVGPixel()}
                    d=${`M0 ${this.stateYAxiMarks[index]} L${this.stageWidth} ${this.stateYAxiMarks[index]}`}>
                  </path>
                `
              : '',
          )}
          ${this.yAxiLabels.map(
            (label, index) =>
              svg`
                <text
                  x=${-this.getSVGPixel(12)}
                  y=${this.stateYAxiMarks[index]}
                  font-size=${this.getSVGPixel(12)}
                  fill="currentColor"
                  text-anchor="end"
                  dominant-baseline="middle">
                  ${label}
                </text>
              `,
          )}
        `
      : '';
  };

  renderMarkLines = () => {
    return html`
      ${this.markLines?.map(
        (
          { value, label, color },
          _index,
          _arr,
          c = color || 'currentColor',
          stageValue = this.getStagePoint([0, value])[1],
        ) =>
          svg`
            <path
              stroke=${c}
              fill="none"
              stroke-width=${this.getSVGPixel()}
              d=${`M0 ${stageValue} L${this.stageWidth} ${stageValue}`}>
            </path>
            <text
              x=${this.stageWidth}
              y=${stageValue - this.getSVGPixel(4)}
              font-size=${this.getSVGPixel(12)}
              fill=${c}
              text-anchor="end"
              dominant-baseline="auto">
              ${label || this.yAxi?.formatter?.(value, 0) || value}
            </text>
          `,
      )}
    `;
  };

  polarToCartesian = ([r, theta]: number[]) => {
    return [r * Math.cos(theta), r * Math.sin(theta)];
  };

  cartesianToPolar = ([x, y]: number[]) => {
    return [Math.sqrt(x ** 2 + y ** 2), Math.atan(y / x)];
  };

  mergeNumberValues = (seqs?: (number | null)[][]) => {
    if (!seqs || !seqs[0]) return;
    return seqs[0].map((_, index) => seqs.reduce((p, c) => p + (c[index] || 0), 0));
  };

  mergeValues = (seqs?: ((number | null)[] | null)[][]) => {
    if (!seqs || !seqs[0]) return;
    return seqs[0].map((point, index) => [point && point[0], seqs.reduce((p, c) => p + (c[index]?.[1] || 0), 0)]);
  };

  findClosestIndex = (values: number[], v: number) => {
    let index = 0;
    let slice = values.slice();
    const check = () => {
      if (slice.length === 1) return;
      if (slice.length === 2) {
        if (v - slice[0] > slice[1] - v) {
          index += 1;
        }
        return;
      }
      const mid = Math.floor(slice.length / 2);
      if (v > slice[mid]) {
        index += mid;
        slice = slice.slice(mid);
      } else {
        slice = slice.slice(0, mid + 1);
      }
      check();
    };
    check();
    return index;
  };
}
