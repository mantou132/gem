import type { Emitter } from '@mantou/gem/lib/decorators';
import { adoptedStyle, emitter, property, state, part, aria, shadow, memo } from '@mantou/gem/lib/decorators';
import type { TemplateResult } from '@mantou/gem/lib/element';
import { css, html, svg } from '@mantou/gem/lib/element';
import { randomStr } from '@mantou/gem/lib/utils';

import { theme } from '../../lib/theme';
import type { Data, DataItem } from '../chart-tooltip';
import { formatToPrecision, adjustRange } from '../../lib/number';
import { commonColors } from '../../lib/color';

import { DuoyunResizeBaseElement } from './resize';

import '../loading';
import '../empty';

export interface Axi {
  formatter?: (value: number | null, index: number) => string;
}

export interface Tooltip {
  titleFormatter?: (value: number | string | null) => string;
  valueFormatter?: (value: number | null) => string;
  filter?: (data: DataItem) => boolean;
  render?: (data: Data) => TemplateResult;
}

export interface MarkLine {
  value: number;
  label?: string;
  color?: string;
}

const style = css`
  :host(:where(:not([hidden]))) {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-size: 0.75em;
  }
  :host(:where(:state(loading), :state(no-data))) {
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
`;

@adoptedStyle(style)
@aria({ role: 'img' })
@shadow()
export class DuoyunChartBaseElement extends DuoyunResizeBaseElement {
  @part static chart: string;

  @property aspectRatio?: number;
  @property filters?: string[];
  @property colors = commonColors;
  @property xAxi?: Axi | null;
  @property yAxi?: Axi | null;
  @property pAxi?: Axi | null;
  @property yMin?: number;
  @property yMax?: number;
  @property xStep = 6;
  @property yStep = 5;
  @property pStep = 5;
  // FIXME: rem change bug
  @property tooltip?: Tooltip;
  @property markLines?: MarkLine[];

  @emitter indexclick: Emitter<number>;

  // FIXME: shake
  @state loading: boolean;
  @state noData: boolean;

  get #aspectRatio() {
    return this.aspectRatio || 2;
  }

  _stageWidth = 300;

  @memo()
  get _stageHeight() {
    return this._stageWidth / this.#aspectRatio;
  }

  _chartId = randomStr();

  #filtersSet = new Set<string>();
  @memo((i) => [i.filters])
  #setFiltersSet() {
    this.#filtersSet = new Set(this.filters);
  }

  // initXAxi
  _xAxiMin = 0;
  _xAxiMax = 0;
  _xAxiUnit = 0;
  _xAxiStepUnit = 0;
  _xAxiMarks = [0];
  _xAxiLabels = [''];
  _stateXAxiMarks = [0];
  // initYAxi
  _yAxiMin = 0;
  _yAxiMax = 0;
  _yAxiUnit = 0;
  _yAxiStepUnit = 0;
  _yAxiMarks = [0];
  _yAxiLabels = [''];
  _stateYAxiMarks = [0];

  _viewBox = [0, 0, 0, 0];

  _isDisabled = (value: string) => {
    return !!this.#filtersSet.size && !this.#filtersSet.has(value);
  };

  _initXAxi = (xMin: number, xMax: number, adjust = false) => {
    if (xMin === Infinity || xMax === -Infinity) return;
    if (adjust) {
      const [min, max] = adjustRange([xMin, xMax], this.xStep, [1000, 60, 5, 6, 2, 2, 12]);
      this._xAxiMin = min;
      this._xAxiMax = max;
    } else {
      this._xAxiMin = xMin;
      this._xAxiMax = xMax;
    }
    this._xAxiUnit = (this._xAxiMax - this._xAxiMin) / this._stageWidth;
    this._xAxiStepUnit = (this._xAxiMax - this._xAxiMin) / this.xStep;
    this._xAxiMarks = Array.from({ length: this.xStep + 1 }, (_, index) => this._xAxiMin + index * this._xAxiStepUnit);
    this._stateXAxiMarks = this._xAxiMarks.map((_, index) => (this._xAxiStepUnit * index) / this._xAxiUnit);
    this._xAxiLabels = this._xAxiMarks.map((e, i) => this.xAxi?.formatter?.(e, i) ?? String(e));
  };

  _initYAxi = (yMin: number, yMax: number) => {
    if (yMin === Infinity || yMax === -Infinity) {
      yMin = 0;
      yMax = 0;
    }
    const markLineValues = (this.markLines || []).map((e) => e.value);
    const [iMin, iMax] = [Math.min(this.yMin || 0, ...markLineValues), Math.max(yMax, ...markLineValues)];
    const [min, max] = this.yMax
      ? [iMin, Math.max(this.yMax, ...markLineValues)]
      : adjustRange([iMin, iMax], this.yStep);
    this._yAxiMin = min;
    this._yAxiMax = max;
    this._yAxiUnit = (this._yAxiMax - this._yAxiMin) / this._stageHeight;
    this._yAxiStepUnit = (this._yAxiMax - 0) / this.yStep;
    this._yAxiMarks = Array.from({ length: this.yStep + 1 }, (_, index) => this._yAxiMin + index * this._yAxiStepUnit);
    this._stateYAxiMarks = this._yAxiMarks.map(
      (_, index, arr) => (this._yAxiStepUnit * (arr.length - 1 - index)) / this._yAxiUnit,
    );
    this._yAxiLabels = this._yAxiMarks.map((e, i) => this.yAxi?.formatter?.(e, i) ?? String(e));
  };

  _initViewBox = () => {
    const charUnit = 3;
    const offsetX =
      this.xAxi === null
        ? 3 * -this._getSVGPixel(12)
        : -this._getSVGPixel(12) -
          this._getSVGPixel(8) * Math.ceil(Math.max(...this._yAxiLabels.map((e) => e.length)) / charUnit) * charUnit;
    const offsetY = this.yAxi === null ? 3 * -this._getSVGPixel(12) : -this._getSVGPixel(12) / 2;
    this._viewBox =
      this.xAxi === null && this.yAxi === null
        ? [0, 0, this._stageWidth, this._stageHeight]
        : [
            offsetX,
            offsetY,
            this._stageWidth - offsetX + 3 * this._getSVGPixel(12),
            this._stageHeight - offsetY + 3.5 * this._getSVGPixel(12),
          ];
  };

  genGradientId = (index: number) => `gradient-${this._chartId}-${index}`;

  // ~=
  _getSVGPixel = (x = 1) => formatToPrecision(x / (this.contentRect.width / this._stageWidth));

  _getStageScale = () => this.contentRect.width / this._viewBox[2];

  // init after
  // from origin data point
  _getStagePoint = ([x, y]: number[]) => {
    return [
      formatToPrecision((x - this._xAxiMin) / this._xAxiUnit),
      formatToPrecision(this._stageHeight - (y - this._yAxiMin) / this._yAxiUnit),
    ];
  };

  // from mouse position
  _getStagePointFromPosition = ([x, y]: number[]) => {
    const svgScale = this._getStageScale();
    const value = [x / svgScale + this._viewBox[0], y / svgScale + this._viewBox[1]];
    if (value[0] < 0 || value[0] > this._stageWidth || value[1] < 0 || value[1] > this._stageHeight) return;
    return value;
  };

  _renderLoading = () => {
    return html`<dy-loading></dy-loading>`;
  };

  _renderNotData = () => {
    return html`<dy-empty></dy-empty>`;
  };

  _renderXAxi = ({ centerLabel, grid }: { centerLabel?: boolean; grid?: boolean } = {}) => {
    const offset = centerLabel ? 0.5 * (this._xAxiStepUnit / this._xAxiUnit) : 0;
    // zoom 选择范围太小时，xAxiUnit 为 0
    return this.xAxi !== null && this._xAxiUnit
      ? svg`
          <path
            stroke=${theme.borderColor}
            fill="none"
            stroke-width=${this._getSVGPixel()}
            d=${`M0 ${this._stageHeight}L${(this._xAxiMax - this._xAxiMin) / this._xAxiUnit} ${this._stageHeight}`}
          ></path>
          ${this._xAxiLabels.map(
            (label, index) => svg`
              ${grid
                ? svg`
                    <path
                      stroke=${theme.lightBackgroundColor}
                      fill="none"
                      stroke-width=${this._getSVGPixel()}
                      d=${`M${this._stateXAxiMarks[index]} ${this._stageHeight} L${this._stateXAxiMarks[index]} 0`}
                    ></path>
                  `
                : ''}
              <path
                stroke=${theme.borderColor}
                fill="none"
                stroke-width=${this._getSVGPixel()}
                d=${`M${this._stateXAxiMarks[index]} ${this._stageHeight} L${this._stateXAxiMarks[index]} ${
                  this._stageHeight + this._getSVGPixel(6)
                }`}
              >
              </path>
              <text
                x=${this._stateXAxiMarks[index] - offset}
                y=${this._stageHeight + this._getSVGPixel(12)}
                font-size=${this._getSVGPixel(12)}
                fill="currentColor"
                text-anchor="middle"
                dominant-baseline="hanging"
              >
                ${label}
              </text>
            `,
          )}
        `
      : '';
  };

  _renderYAxi = () => {
    return this.yAxi !== null
      ? html`
          ${this._stateYAxiMarks.map((_, index) =>
            index !== 0
              ? svg`
                  <path
                    stroke=${theme.lightBackgroundColor}
                    fill="none"
                    stroke-width=${this._getSVGPixel()}
                    d=${`M0 ${this._stateYAxiMarks[index]} L${this._stageWidth} ${this._stateYAxiMarks[index]}`}
                  >
                  </path>
                `
              : '',
          )}
          ${this._yAxiLabels.map(
            (label, index) => svg`
              <text
                x=${-this._getSVGPixel(12)}
                y=${this._stateYAxiMarks[index]}
                font-size=${this._getSVGPixel(12)}
                fill="currentColor"
                text-anchor="end"
                dominant-baseline="middle"
              >
                ${label}
              </text>
            `,
          )}
        `
      : '';
  };

  _renderMarkLines = () => {
    return html`
      ${this.markLines?.map(
        (
          { value, label, color },
          _index,
          _arr,
          c = color || 'currentColor',
          stageValue = this._getStagePoint([0, value])[1],
        ) => svg`
          <path
            stroke=${c}
            fill="none"
            stroke-width=${this._getSVGPixel()}
            d=${`M0 ${stageValue} L${this._stageWidth} ${stageValue}`}
          >
          </path>
          <text
            x=${this._stageWidth}
            y=${stageValue - this._getSVGPixel(4)}
            font-size=${this._getSVGPixel(12)}
            fill=${c}
            text-anchor="end"
            dominant-baseline="auto"
          >
            ${label || this.yAxi?.formatter?.(value, 0) || value}
          </text>
        `,
      )}
    `;
  };

  _polarToCartesian = ([r, theta]: number[]) => {
    return [r * Math.cos(theta), r * Math.sin(theta)];
  };

  _cartesianToPolar = ([x, y]: number[]) => {
    return [Math.sqrt(x ** 2 + y ** 2), Math.atan(y / x)];
  };

  _mergeNumberValues = (seqs?: (number | null)[][]) => {
    if (!seqs || !seqs[0]) return;
    return seqs[0].map((_, index) => seqs.reduce((p, c) => p + (c[index] || 0), 0));
  };

  _mergeValues = (seqs?: ((number | null)[] | null)[][]) => {
    if (!seqs || !seqs[0]) return;
    return seqs[0].map((point, index) => [point && point[0], seqs.reduce((p, c) => p + (c[index]?.[1] || 0), 0)]);
  };

  _findClosestIndex = (values: number[], v: number) => {
    let index = 0;
    let slice = values.slice();
    if (values.length === 0) return -1;
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
