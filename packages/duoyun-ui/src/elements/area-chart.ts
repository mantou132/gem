import { html, svg } from '@mantou/gem/lib/element';
import { customElement, emitter, Emitter, property } from '@mantou/gem/lib/decorators';
import { classMap } from '@mantou/gem/lib/utils';

import { isNullish } from '../lib/types';
import { theme } from '../lib/theme';

import { DuoyunChartBaseElement } from './base/chart';
import { ChartTooltip, DataItem } from './chart-tooltip';

import './chart-zoom';

export interface Sequence {
  label: string;
  value?: string;
  values: (number | null)[][];
}

export interface SymbolRenderOption {
  point: number[];
  color: string;
  isHover: boolean;
  chart: DuoyunAreaChartElement;
}

export function defaultSymbolRender({ point, color, isHover, chart }: SymbolRenderOption) {
  return svg`
    <circle
      class="symbol"
      stroke=${color}
      r=${chart.getSVGPixel(isHover ? 3 : 2)}
      cx=${point[0]}
      cy=${point[1]}
    />
  `;
}

/**
 * @customElement dy-area-chart
 */
@customElement('dy-area-chart')
export class DuoyunAreaChartElement extends DuoyunChartBaseElement {
  @property fill = true;
  @property stroke = true;
  @property stack = false; // force to smooth, force to fill, prevent smooth
  @property symbol = false;
  @property symbolRender = defaultSymbolRender;
  @property chartzoom = false;
  @property range = [0, 1];
  @property smooth = true;
  @property gradient = true;
  @property sequences?: Sequence[];

  @emitter zoom: Emitter<number[]>;

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

  constructor() {
    super();
    this.addEventListener('pointermove', this.#onPointerMove);
    this.addEventListener('pointerout', this.#onPointerOut);
    this.addEventListener('pointerend', this.#onPointerOut);
    this.addEventListener('click', this.#onClick);
  }

  state = {
    hoverIndex: NaN,
    hoverLine: '',
    hoverSequence: '',
  };

  #needReverse = false;
  #xValues?: (number | null)[];
  #sequencesNormalize?: Sequence[];
  #sequencesWithoutStack?: Sequence[];
  #sequences?: Sequence[];
  #totalValues?: (number | null)[][] = [];
  #paths = [''];
  #areas = [''];
  #symbolSequences: (number[] | null)[][] = [];

  #isDisabeld = (value: string) => {
    return !!this.filtersSet.size && !this.filtersSet.has(value);
  };

  #preProcessEvent = (evt: MouseEvent) => {
    const { x, y } = this.getBoundingClientRect();
    const point = [evt.x - x, evt.y - y];
    const value = this.getStagePointFromPosition(point);
    if (!value) {
      this.#onPointerOut();
    } else {
      let index = -1;
      let xValue = this.xAxiMin + value[0] * this.xAxiUnit;
      if (this.#sequencesNormalize) {
        index = this.findClosestIndex(this.#xValues as any, xValue);
        xValue = this.#sequencesNormalize[0].values[index][0]!;
        const xAbsPos = (xValue - this.xAxiMin) / this.xAxiUnit;
        if (this.state.hoverIndex !== index) {
          this.setState({ hoverIndex: index, hoverLine: `M${xAbsPos} 0L${xAbsPos} ${this.stageHeight}` });
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
      title: this.tooltip?.formatter?.(current.xValue) || String(current.xValue),
      values: this.#sequencesNormalize
        ?.map(({ values, label, value }, i) => {
          const [_, v] = values[current.index];
          return {
            label,
            value: this.yAxi?.formatter?.(v, 0) || String(v),
            color: this.colors[i],
            hidden: !!this.filtersSet.size && !this.filtersSet.has(value ?? label),
            highlight: this.state.hoverSequence === (value ?? label),
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
                if (isNaN(an)) return 1;
                if (isNaN(bn)) return -1;
                return an > bn ? -1 : 1;
              },
        ),
    });
  };

  #onPointerOut = () => {
    this.setState({ hoverIndex: NaN, hoverLine: '' });
    ChartTooltip.close();
  };

  #genPath = (sequences: Sequence[], isArea = false) => {
    this.#symbolSequences = [];
    const controlPointFromPrev = (prev: number[], point: number[], next: number[], n = 1) => {
      const t = (point[0] - prev[0]) / 2;
      const x = point[0] - n * t;
      if ((point[1] > prev[1] && next[1] > point[1]) || (point[1] < prev[1] && next[1] < point[1])) {
        const slope1 = (next[1] - point[1]) / (next[0] - point[0]);
        const slope2 = (point[1] - prev[1]) / (point[0] - prev[0]);
        const slope = Math.abs(slope1) < Math.abs(slope2) ? slope1 : slope2;
        return [x, point[1] - n * slope * t];
      }
      return [x, point[1]];
    };
    const isEmpty = (prev: (number | null)[] | null) => isNullish(prev) || isNullish(prev[0]) || isNullish(prev[1]);
    return sequences.map(({ values }) => {
      const dots: (number[] | null)[] = [];
      const path = values
        .map(([x, y], index, arr) => {
          const prevPrev = arr[index - 2];
          const prev = arr[index - 1];
          const next = arr[index + 1];
          const currentNull = isNullish(x) || isNullish(y);
          if (currentNull) {
            dots.push(null);
            return '';
          }
          const point = this.getStagePoint([x, y]);
          dots.push(point);
          const isLastDot = index === arr.length - 1;
          const prevPrevNull = isEmpty(prevPrev);
          const prevNull = isEmpty(prev);
          const nextNull = isEmpty(next);
          // orphan
          if (prevNull && nextNull) {
            return '';
          }
          if (nextNull) {
            const curve =
              this.#smooth && isLastDot && !prevNull && !prevPrevNull
                ? `C${controlPointFromPrev(
                    this.getStagePoint(prevPrev as number[]),
                    this.getStagePoint(prev as number[]),
                    point,
                    -1,
                  )},${point.join(' ')},${point.join(' ')}`
                : `L${point.join(' ')}`;
            return isArea ? `${curve}L${point[0]} ${this.stageHeight}` : `${curve}L${point.join(' ')}`;
          }
          if (prevNull) {
            return isArea ? `M${point[0]} ${this.stageHeight}L${point.join(' ')}` : `M${point.join(' ')}`;
          }
          return this.#smooth
            ? `S${controlPointFromPrev(
                this.getStagePoint(prev as number[]),
                point,
                this.getStagePoint(next as number[]),
              ).join()} ${point.join(' ')}`
            : `L${point.join(' ')}`;
        })
        .join('');
      if (this.symbol) {
        this.#symbolSequences.push(dots);
      }
      return path;
    });
  };

  willMount = () => {
    this.memo(
      () => {
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
          ? this.#sequencesWithoutStack?.map((e, index) => ({
              ...e,
              values: this.mergeValues(this.#sequencesWithoutStack!.slice(0, index + 1).map((e) => e.values))!,
            }))
          : this.#sequencesWithoutStack;
        if (this.chartzoom) {
          this.#totalValues = this.mergeValues(this.#sequencesNormalize?.map((e) => e.values));
        }
      },
      () => [this.sequences, ...this.range],
    );
    this.memo(
      () => {
        if (!this.contentRect.width) return;
        if (!this.#sequences?.length) return;
        let xMin = Infinity;
        let xMax = -Infinity;
        let yMin = Infinity;
        let yMax = -Infinity;
        this.#sequences.forEach(({ values }) => {
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
        this.initXAxi(xMin, xMax, xMin > 946684800000 && this.#isDefaultRange);
        this.initYAxi(yMin, yMax);
        this.initViewBox();

        this.#paths = this.#genPath(this.#sequences);
        this.#areas = this.#genPath(this.#sequences, true);
      },
      () => [this.#sequences, this.#smooth, this.contentRect.width],
    );
  };

  mounted = () => {
    return () => ChartTooltip.close();
  };

  render = () => {
    if (this.loading) return this.renderLoading();
    if (this.noData) return this.renderNotData();
    if (!this.contentRect.width || !this.#sequences?.length) return html``;
    const areaOpacity = this.stack ? 1 : this.#gradient ? 0.3 : 0.15;
    const areaHighlightOpacity = this.#gradient ? 0.4 : 0.2;

    return html`
      <style>
        .hit-line {
          pointer-events: stroke;
        }
        .hit-line:hover + .line {
          stroke-width: ${this.getSVGPixel(2)}px;
        }
        .hit-line:hover + .line + .area {
          opacity: ${areaHighlightOpacity};
        }
        .hit-line + .line,
        .hover-line,
        .disabled {
          pointer-events: none;
        }
        .area {
          pointer-events: ${this.stack ? 'all' : 'none'};
        }
        .area:hover {
          filter: brightness(1.1);
        }
        .line.disabled {
          stroke: ${theme.disabledColor};
          opacity: 0.3;
        }
        .area.disabled {
          fill: ${theme.disabledColor};
          opacity: 0.1;
        }
        .symbol {
          pointer-events: none;
          fill: ${theme.backgroundColor};
          stroke-width: ${this.getSVGPixel(1)};
        }
        dy-chart-zoom {
          --left: ${-this.viewBox[0] * this.getStageScale()}px;
          --right: ${(this.viewBox[2] + this.viewBox[0] - this.stageWidth) * this.getStageScale()}px;
          width: calc(100% - var(--left) - var(--right));
          margin-inline-start: var(--left);
          align-self: flex-start;
        }
      </style>
      ${svg`
        <svg aria-hidden="true" part=${
          DuoyunChartBaseElement.chart
        } xmlns="http://www.w3.org/2000/svg" viewBox=${this.viewBox.join(' ')}>
          ${
            this.#gradient
              ? svg`
                  <defs>
                    ${this.#sequences?.map(
                      (_, index) => svg`
                        <linearGradient id="${this.genGradientId(index)}" gradientTransform="rotate(90)">
                          <stop offset="10%"  stop-color=${this.colors[index]} />
                          <stop offset="90%" stop-opacity="0.2" stop-color=${this.colors[index]} />
                        </linearGradient>
                        `,
                    )}
                  </defs>
                `
              : ''
          }
          ${this.renderXAxi()}
          ${this.renderYAxi()}
          ${this.#sequences.map(
            (
              _,
              index,
              arr,
              revertIndex = arr.length - 1 - index,
              sequence = this.#sequences![revertIndex],
              value = sequence.value ?? sequence.label,
              disabled = this.#isDisabeld(value),
            ) =>
              svg`
                ${
                  !this.stack
                    ? svg`
                        <path
                          class=${classMap({ 'hit-line': true, disabled })}
                          stroke="transparent"
                          fill="none"
                          stroke-width=${this.getSVGPixel(10)}
                          d=${this.#paths[revertIndex]}
                          @pointerover=${() => this.setState({ hoverSequence: value })}
                          @pointerout=${() => this.setState({ hoverSequence: '' })}
                        ></path>
                        <path
                          class=${classMap({ line: true, disabled })}
                          stroke=${this.colors[revertIndex]}
                          fill="none"
                          stroke-width=${this.stroke ? this.getSVGPixel(1) : 0}
                          d=${this.#paths[revertIndex]}
                        ></path>
                      `
                    : ''
                }
                ${
                  this.#fill
                    ? svg`
                        <path
                          class=${classMap({ area: true, disabled })}
                          opacity=${areaOpacity}
                          fill=${this.#gradient ? `url(#${this.genGradientId(revertIndex)})` : this.colors[revertIndex]}
                          d=${this.#areas[revertIndex]}
                          @pointerover=${() => this.stack && this.setState({ hoverSequence: value })}
                          @pointerout=${() => this.stack && this.setState({ hoverSequence: '' })}
                        ></path>
                      `
                    : ''
                }
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
                          isHover: i === this.state.hoverIndex,
                          chart: this,
                        })
                      : '',
                  ),
                )
              : ''
          }
          ${this.renderMarkLines()}
          <path
            class="hover-line"
            d=${this.state.hoverLine}
            stroke=${theme.borderColor}
            stroke-width=${this.getSVGPixel()}
            stroke-dasharray=${`${this.getSVGPixel(4)} ${this.getSVGPixel(1.5)}`}>
          </path>
        </svg>
      `} ${this.chartzoom
        ? html`
            <dy-chart-zoom
              @change=${({ detail }: CustomEvent) => this.zoom(detail)}
              .values=${this.#totalValues}
              .value=${this.range}
            ></dy-chart-zoom>
          `
        : ''}
    `;
  };
}
