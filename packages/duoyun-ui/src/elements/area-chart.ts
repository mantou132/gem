import { createDecoratorTheme } from '@mantou/gem/helper/theme';
import type { Emitter } from '@mantou/gem/lib/decorators';
import { adoptedStyle, customElement, emitter, memo, mounted, property } from '@mantou/gem/lib/decorators';
import { createState, css, html, svg } from '@mantou/gem/lib/element';
import { addListener, classMap } from '@mantou/gem/lib/utils';

import { theme } from '../lib/theme';
import { isNotNullish } from '../lib/types';
import { DuoyunChartBaseElement } from './base/chart';
import type { DataItem } from './chart-tooltip';
import { ChartTooltip } from './chart-tooltip';

import './chart-zoom';

export interface Sequence {
  label: string;
  value?: string;
  values: (number | null)[][];
}

export interface SymbolRenderOptions {
  point: number[];
  color: string;
  isHover: boolean;
  chart: DuoyunAreaChartElement;
}

export function defaultSymbolRender({ point, color, isHover, chart }: SymbolRenderOptions) {
  return svg`
    <circle class="symbol" stroke=${color} r=${chart._getSVGPixel(isHover ? 3 : 2)} cx=${point[0]} cy=${point[1]} />
  `;
}

const elementTheme = createDecoratorTheme({
  lineStrokeWidth: 0,
  areaHighlightOpacity: 0,
  areaPointer: '',
  areaOpacity: 0,
  zoomLeft: '',
  zoomRight: '',
  symbolStrokeWidth: 0,
});

const style = css`
  .hit-line {
    pointer-events: stroke;
  }
  .hit-line:hover + .line {
    stroke-width: ${elementTheme.lineStrokeWidth};
  }
  .hit-line:hover + .line + .area {
    opacity: ${elementTheme.areaHighlightOpacity};
  }
  .hit-line + .line,
  .hover-line,
  .disabled {
    pointer-events: none;
  }
  .area {
    pointer-events: ${elementTheme.areaPointer};
  }
  .area:hover {
    filter: brightness(1.1);
  }
  .line.disabled {
    stroke: ${theme.disabledColor};
    opacity: 0.3;
  }
  .area {
    opacity: ${elementTheme.areaOpacity};
  }
  .area.disabled {
    fill: ${theme.disabledColor};
    opacity: 0.1;
  }
  .symbol {
    pointer-events: none;
    fill: ${theme.backgroundColor};
    stroke-width: ${elementTheme.symbolStrokeWidth};
  }
  dy-chart-zoom {
    width: calc(100% - ${elementTheme.zoomLeft} - ${elementTheme.zoomRight});
    margin-inline-start: ${elementTheme.zoomLeft};
    align-self: flex-start;
  }
`;

@customElement('dy-area-chart')
@adoptedStyle(style)
export class DuoyunAreaChartElement extends DuoyunChartBaseElement {
  @property fill = true;
  @property stroke = true;
  @property stack = false; // force to smooth, force to fill, prevent smooth
  @property symbol = false;
  @property symbolRender = defaultSymbolRender;
  /**@deprecated */
  @property chartzoom = false;
  @property chartZoom = false;
  @property range = [0, 1];
  @property smooth = true;
  @property gradient = true;
  @property sequences?: Sequence[];

  @emitter zoom: Emitter;

  get #chartZoom() {
    return this.chartZoom || this.chartzoom;
  }

  get #smooth() {
    return this.stack || this.smooth;
  }

  get #gradient() {
    return !this.stack && this.gradient;
  }

  get #fill() {
    return this.stack || this.fill;
  }

  get #isDefaultRange() {
    return this.range[0] === 0 && this.range[1] === 1;
  }

  get #isEmpty() {
    return this.noData || this.loading || !this.#sequences?.[0]?.values.length;
  }

  #state = createState({
    hoverIndex: NaN,
    hoverLine: '',
    hoverSequence: '',
  });

  #needReverse = false;
  #xValues?: (number | null)[];
  #sequencesNormalize?: Sequence[];
  #sequencesWithoutStack?: Sequence[];
  #sequences?: Sequence[];
  #totalValues?: (number | null)[][] = [];
  #paths = [''];
  #areas = [''];
  #symbolSequences: (number[] | null)[][] = [];

  #preProcessEvent = (evt: MouseEvent) => {
    const { x, y } = this.getBoundingClientRect();
    const point = [evt.x - x, evt.y - y];
    const value = this._getStagePointFromPosition(point);
    if (!value) {
      this.#onPointerOut();
    } else {
      let index = -1;
      let xValue = this._xAxiMin + value[0] * this._xAxiUnit;
      if (this.#sequencesNormalize) {
        index = this._findClosestIndex(this.#xValues as any, xValue);
        xValue = this.#sequencesNormalize[0].values[index][0]!;
        const xAbsPos = (xValue - this._xAxiMin) / this._xAxiUnit;
        if (this.#state.hoverIndex !== index) {
          this.#state({ hoverIndex: index, hoverLine: `M${xAbsPos} 0L${xAbsPos} ${this._stageHeight}` });
        }
      }
      return { index, xValue };
    }
  };

  #onClick = (evt: MouseEvent) => {
    if (this.#isEmpty) return;
    const current = this.#preProcessEvent(evt);
    if (!current) return;
    this.indexclick(this.#needReverse ? this.sequences![0].values.length - 1 - current.index : current.index);
  };

  #onPointerMove = (evt: MouseEvent) => {
    if (this.#isEmpty) return;
    const current = this.#preProcessEvent(evt);
    if (!current) return;
    ChartTooltip.open(evt.x, evt.y, {
      render: this.tooltip?.render,
      xValue: current.xValue,
      title: this.tooltip?.titleFormatter?.(current.xValue) || String(current.xValue),
      values: this.#sequencesNormalize
        ?.map(({ values, label, value }, i) => {
          const [_, v] = values[current.index];
          return {
            label,
            value: this.tooltip?.valueFormatter?.(v) || this.yAxi?.formatter?.(v, 0) || String(v),
            color: this.colors[i],
            hidden: this._isDisabled(value ?? label),
            highlight: this.#state.hoverSequence === (value ?? label),
            originValue: v,
          } as DataItem;
        })
        .filter(this.tooltip?.filter || (() => true))
        .sort(
          this.stack
            ? () => -1
            : (a, b) => {
                const an = Number(a.originValue);
                const bn = Number(b.originValue);
                if (Number.isNaN(an)) return 1;
                if (Number.isNaN(bn)) return -1;
                return an > bn ? -1 : 1;
              },
        ),
    });
  };

  #onPointerOut = () => {
    this.#state({ hoverIndex: NaN, hoverLine: '' });
    ChartTooltip.close();
  };

  #genPath = (sequences: Sequence[], isArea = false) => {
    this.#symbolSequences = [];
    const controlPointFromPrev = (prev: number[], point: number[], next: number[], dir = 1) => {
      const t = (point[0] - prev[0]) / 2;
      const x = point[0] - dir * t;
      if ((point[1] > prev[1] && next[1] > point[1]) || (point[1] < prev[1] && next[1] < point[1])) {
        const slope1 = (next[1] - point[1]) / (next[0] - point[0]);
        const slope2 = (point[1] - prev[1]) / (point[0] - prev[0]);
        const slope = Math.abs(slope1) < Math.abs(slope2) ? slope1 : slope2;
        return [x, point[1] - dir * slope * t];
      }
      return [x, point[1]];
    };
    const isValidPoint = (point: null | (number | null)[]): point is number[] => {
      return isNotNullish(point) && isNotNullish(point[0]) && isNotNullish(point[1]);
    };
    return sequences.map(({ values }) => {
      const dots: (number[] | null)[] = [];
      const path = values
        .map((origin, index, arr) => {
          const prevPrev = arr[index - 2];
          const prev = arr[index - 1];
          const next = arr[index + 1];
          if (!isValidPoint(origin)) {
            dots.push(null);
            return '';
          }
          const point = this._getStagePoint(origin);
          dots.push(point);
          const isLastDot = index === arr.length - 1;
          const prevValid = isValidPoint(prev);
          const nextValid = isValidPoint(next);
          // orphan
          if (!prevValid && !nextValid) {
            return '';
          }
          if (!nextValid) {
            const prevPrevValid = isValidPoint(prevPrev);
            const curve =
              this.#smooth && isLastDot && prevValid && prevPrevValid
                ? `C${this._getStagePoint(controlPointFromPrev(prevPrev, prev, origin, -1))},${point.join(
                    ' ',
                  )},${point.join(' ')}`
                : `L${point.join(' ')}`;
            return isArea ? `${curve}L${point[0]} ${this._stageHeight}` : `${curve}L${point.join(' ')}`;
          }
          if (!prevValid) {
            return isArea ? `M${point[0]} ${this._stageHeight}L${point.join(' ')}` : `M${point.join(' ')}`;
          }
          return this.#smooth
            ? `S${this._getStagePoint(controlPointFromPrev(prev, origin, next)).join()} ${point.join(' ')}`
            : `L${point.join(' ')}`;
        })
        .join('');
      if (this.symbol) {
        this.#symbolSequences.push(dots);
      }
      return path;
    });
  };

  @memo((i) => [i.sequences, ...i.range, i.#chartZoom])
  #calcSeqList = () => {
    const [start, stop] = this.range;
    const values = this.sequences?.[0]?.values;

    this.#needReverse = !!values && (values[0] || 0) > (values[values.length - 1] || 0);

    this.#sequencesNormalize = this.#needReverse
      ? this.sequences?.map((e) => ({ ...e, values: e.values.reverse() }))
      : this.sequences;

    this.#xValues = this.#sequencesNormalize?.[0]?.values.map((e) => e[0]);

    this.#sequencesWithoutStack = this.#sequencesNormalize?.map((e) => {
      return {
        ...e,
        values: e.values.slice(e.values.length * start, e.values.length * stop),
      };
    });
    if (!this.#sequencesWithoutStack?.[0]?.values.length && !this.#isDefaultRange) {
      this.#sequencesWithoutStack = this.#sequencesNormalize;
      this.zoom([0, 1]);
    }
    this.#sequences = this.stack
      ? this.#sequencesWithoutStack?.map((seq, index) => ({
          ...seq,
          values: this._mergeValues(this.#sequencesWithoutStack!.slice(0, index + 1).map((e) => e.values))!,
        }))
      : this.#sequencesWithoutStack;
    if (this.#chartZoom) {
      this.#totalValues = this._mergeValues(this.#sequencesNormalize?.map((e) => e.values));
    }
  };

  @memo((i) => [i.#sequences, i.#smooth, i.contentRect.width, i.aspectRatio])
  #calcPath = () => {
    if (!this.contentRect.width) return;
    if (!this.#sequences?.length) return;
    let xMin = Infinity;
    let xMax = -Infinity;
    let yMin = Infinity;
    let yMax = -Infinity;
    this.#sequences.forEach(({ values }) => {
      values.forEach(([x, y]) => {
        if (isNotNullish(x)) {
          xMin = Math.min(xMin, x);
          xMax = Math.max(xMax, x);
        }
        if (isNotNullish(y)) {
          yMin = Math.min(yMin, y);
          yMax = Math.max(yMax, y);
        }
      });
    });
    this._initXAxi(xMin, xMax, xMin > 946684800000 && this.#isDefaultRange);
    this._initYAxi(yMin, yMax);
    this._initViewBox();

    this.#paths = this.#genPath(this.#sequences);
    this.#areas = this.#genPath(this.#sequences, true);
  };

  @mounted()
  #init = () => {
    addListener(this, 'pointermove', this.#onPointerMove);
    addListener(this, 'pointerout', this.#onPointerOut);
    addListener(this, 'pointercancel', this.#onPointerOut);
    addListener(this, 'click', this.#onClick);
  };

  @elementTheme()
  #theme = () => ({
    lineStrokeWidth: this._getSVGPixel(2),
    symbolStrokeWidth: this._getSVGPixel(1),
    areaHighlightOpacity: this.#gradient ? 0.4 : 0.2,
    areaOpacity: this.stack ? 1 : this.#gradient ? 0.3 : 0.15,
    areaPointer: this.stack ? 'all' : 'none',
    zoomLeft: `${-this._viewBox[0] * this._getStageScale()}px`,
    zoomRight: `${(this._viewBox[2] + this._viewBox[0] - this._stageWidth) * this._getStageScale()}px`,
  });

  render = () => {
    if (this.loading) return this._renderLoading();
    if (this.noData) return this._renderNotData();
    if (!this.contentRect.width || !this.#sequences?.length) return html``;

    return html`
      ${svg`
        <svg
          aria-hidden="true"
          part=${DuoyunChartBaseElement.chart}
          xmlns="http://www.w3.org/2000/svg"
          viewBox=${this._viewBox.join(' ')}
        >
          <defs v-if=${this.#gradient}>
            ${this.#sequences?.map(
              (_, index) => svg`
                <linearGradient id="${this.genGradientId(index)}" gradientTransform="rotate(90)">
                  <stop offset="10%" stop-color=${this.colors[index]} />
                  <stop offset="90%" stop-opacity="0.2" stop-color=${this.colors[index]} />
                </linearGradient>
              `,
            )}
          </defs>
          ${this._renderXAxi()} ${this._renderYAxi()}
          ${this.#sequences.map(
            (
              _,
              index,
              arr,
              revertIndex = arr.length - 1 - index,
              sequence = this.#sequences![revertIndex],
              value = sequence.value ?? sequence.label,
              disabled = this._isDisabled(value),
            ) => svg`
              <path
                v-if=${!this.stack}
                class=${classMap({ 'hit-line': true, disabled })}
                stroke="transparent"
                fill="none"
                stroke-width=${this._getSVGPixel(10)}
                d=${this.#paths[revertIndex]}
                @pointerover=${() => this.#state({ hoverSequence: value })}
                @pointerout=${() => this.#state({ hoverSequence: '' })}
              ></path>
              <path
                v-if=${!this.stack}
                class=${classMap({ line: true, disabled })}
                stroke=${this.colors[revertIndex]}
                fill="none"
                stroke-width=${this.stroke ? this._getSVGPixel(1) : 0}
                d=${this.#paths[revertIndex]}
              ></path>
              <path
                v-if=${this.#fill}
                class=${classMap({ area: true, disabled })}
                fill=${this.#gradient ? `url(#${this.genGradientId(revertIndex)})` : this.colors[revertIndex]}
                d=${this.#areas[revertIndex]}
                @pointerover=${() => this.stack && this.#state({ hoverSequence: value })}
                @pointerout=${() => this.stack && this.#state({ hoverSequence: '' })}
              ></path>
            `,
          )}
          ${
            this.symbol
              ? this.#symbolSequences.map((dots, index) =>
                  dots.map((point, i) =>
                    point
                      ? this.symbolRender({
                          point,
                          color: this.colors[index],
                          isHover: i === this.#state.hoverIndex,
                          chart: this,
                        })
                      : '',
                  ),
                )
              : ''
          }
          ${this._renderMarkLines()}
          <path
            class="hover-line"
            d=${this.#state.hoverLine}
            stroke=${theme.borderColor}
            stroke-width=${this._getSVGPixel()}
            stroke-dasharray=${`${this._getSVGPixel(4)} ${this._getSVGPixel(1.5)}`}
          ></path>
        </svg>
      `}
      <dy-chart-zoom
        v-if=${this.#chartZoom}
        @change=${({ detail }: CustomEvent) => this.zoom(detail)}
        .values=${this.#totalValues}
        .value=${this.range}
      ></dy-chart-zoom>
    `;
  };
}
