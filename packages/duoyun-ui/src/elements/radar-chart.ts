import { css, svg } from '@mantou/gem/lib/element';
import { adoptedStyle, customElement, memo, property } from '@mantou/gem/lib/decorators';
import { createDecoratorTheme } from '@mantou/gem/helper/theme';
import { classMap } from '@mantou/gem/lib/utils';

import { theme } from '../lib/theme';
import { isNotNullish, isNullish } from '../lib/types';

import { DuoyunChartBaseElement } from './base/chart';
import { ChartTooltip } from './chart-tooltip';

export interface Dimension {
  label: string;
  max?: number;
  min?: number;
}

export interface Sequence {
  label: string;
  values: (number | null)[];
}

interface ProcessedDimension extends Dimension {
  max: number;
  min: number;
}

type Point = [number, number];

const elementTheme = createDecoratorTheme({
  axisStrokeWidth: 0,
  polygonStrokeWidth: 0,
  pointStrokeWidth: 0,
  pointHoverStrokeWidth: 0,
});

const style = css`
  .axis {
    stroke: ${theme.borderColor};
    stroke-width: ${elementTheme.axisStrokeWidth};
    stroke-dasharray: 4 2;
    fill: none;
  }
  .axis-label {
    fill: ${theme.textColor};
  }
  .polygon {
    fill-opacity: 0.2;
    stroke-width: ${elementTheme.polygonStrokeWidth};
    transition: all 0.2s;

    &:hover {
      fill-opacity: 0.4;
    }
  }
  .point {
    fill: ${theme.backgroundColor};
    stroke-width: ${elementTheme.pointStrokeWidth};

    &:hover {
      stroke-width: ${elementTheme.pointHoverStrokeWidth};
    }
  }
  .disabled {
    stroke: ${theme.disabledColor};
    pointer-events: none;
    fill: none;
  }
`;

@customElement('dy-radar-chart')
@adoptedStyle(style)
export class DuoyunRadarChartElement extends DuoyunChartBaseElement {
  @property dimensions?: Dimension[];
  @property sequences?: Sequence[];
  @property showPoint = true;
  @property showArea = true;

  xAxi = null;
  yAxi = null;

  #onPointMove = (evt: MouseEvent, seqIndex: number, pointIndex: number) => {
    const sequence = this.sequences![seqIndex];
    const dimension = this.dimensions![pointIndex];
    const value = sequence.values[pointIndex];
    if (isNullish(value) || !dimension) return;

    ChartTooltip.open(evt.x, evt.y, {
      render: this.tooltip?.render,
      title: dimension.label,
      values: this.sequences?.map((seq, i) => {
        const v = seq.values[pointIndex];
        return {
          label: seq.label,
          value: (v && this.pAxi?.formatter?.(v, 0)) || String(v),
          color: this.colors[i],
          originValue: value,
          highlight: i === seqIndex,
          hidden: this._isDisabled(seq.label),
        };
      }),
    });
  };

  #onPointOut = () => {
    ChartTooltip.close();
  };

  #processedDimensions?: ProcessedDimension[];

  @memo((i) => [i.sequences, i.dimensions])
  #preprocess = () => {
    if (!this.sequences || !this.dimensions) return;

    this.#processedDimensions = this.dimensions.map((dimension, index) => {
      const values = this.sequences!.map((e) => e.values.at(index)).filter(isNotNullish);
      return {
        ...dimension,
        min: Math.min(0, ...values),
        max: Math.max(100, ...values),
      };
    });
  };

  #axisLines: string[];
  #dimensionsPoints: { start: Point; end: Point; angle: number }[];
  #sequences: Point[][];

  @memo((i) => [i.sequences, i.contentRect.width, i.aspectRatio, i.pStep])
  #calc = () => {
    if (!this.contentRect.width) return;
    if (!this.#processedDimensions || !this.sequences) return;

    const centerX = this._stageWidth / 2;
    const centerY = this._stageHeight / 2;
    const maxRadius = Math.min(centerX, centerY) * 0.8;
    const dimensionCount = this.#processedDimensions.length;
    const getAngle = (dimensionIndex: number) => (dimensionIndex / dimensionCount) * 2 * Math.PI - Math.PI / 2;

    this.#axisLines = Array.from({ length: this.pStep }, (_, i) => {
      const radius = ((i + 1) / this.pStep) * maxRadius;
      return Array.from({ length: dimensionCount }, (__, j) => {
        const angle = getAngle(j);
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        return `${x},${y}`;
      }).join(' ');
    });

    this.#dimensionsPoints = this.#processedDimensions.map((_, i) => {
      const angle = getAngle(i);
      const endX = centerX + Math.cos(angle) * maxRadius;
      const endY = centerY + Math.sin(angle) * maxRadius;
      return { start: [centerX, centerY], end: [endX, endY], angle };
    });

    this.#sequences = this.sequences.map((sequence) =>
      sequence.values.map((value, index) => {
        if (value === null || !this.#processedDimensions) return [centerX, centerY];
        const angle = getAngle(index);
        const dimension = this.#processedDimensions[index];
        const normalizedValue = (value - dimension.min) / (dimension.max - dimension.min);

        return [
          centerX + Math.cos(angle) * normalizedValue * maxRadius,
          centerY + Math.sin(angle) * normalizedValue * maxRadius,
        ];
      }),
    );

    this._initViewBox();
  };

  @elementTheme()
  #theme = () => ({
    axisStrokeWidth: this._getSVGPixel(1),
    polygonStrokeWidth: this._getSVGPixel(1),
    pointStrokeWidth: this._getSVGPixel(1),
    pointHoverStrokeWidth: this._getSVGPixel(2),
  });

  render = () => {
    if (this.loading) return this._renderLoading();
    if (this.noData) return this._renderNotData();
    if (!this.contentRect.width || !this.sequences || !this.dimensions) return svg``;

    return svg`
      <svg part=${DuoyunChartBaseElement.chart} xmlns="http://www.w3.org/2000/svg" viewBox=${this._viewBox.join(' ')}>
        ${this.#axisLines.map((points) => svg`<polygon class="axis" points=${points} />`)}
        ${this.#dimensionsPoints.map(({ start, end, angle }, i) => {
          const isTop = i === 0;
          const isBottom = angle === -Math.PI / 2;
          const isLeft = angle > Math.PI / 2 || angle < -Math.PI / 2;
          const isCenter = angle === -Math.PI / 2 || angle === Math.PI / 2;
          return svg`
            <line class="axis" x1=${start[0]} y1=${start[1]} x2=${end[0]} y2=${end[1]} />
            <text
              class="axis-label"
              x=${end[0]}
              y=${end[1]}
              font-size=${this._getSVGPixel(12)}
              dx=${`${isCenter ? 0 : isLeft ? -0.5 : 0.5}em`}
              dy=${`${isTop ? -1 : isBottom ? 1 : 0}em`}
              text-anchor=${isCenter ? 'middle' : isLeft ? 'end' : 'start'}
              dominant-baseline=${'middle'}
            >
              ${this.#processedDimensions![i].label}
            </text>
          `;
        })}
        ${this.#sequences.map(
          (points, seqIndex) => svg`
            <polygon
              class=${classMap({ polygon: true, disabled: this._isDisabled(this.sequences![seqIndex].label) })}
              fill=${this.showArea ? this.colors[seqIndex] : 'none'}
              stroke=${this.colors[seqIndex]}
              points=${points.map(([x, y]) => `${x},${y}`).join(' ')}
              @click=${() => this.indexclick(seqIndex)}
            />
          `,
        )}
        ${this.#sequences.map((points, seqIndex) =>
          this.showPoint
            ? points.map(
                ([x, y], pointIndex) => svg`
                  <circle
                    class=${classMap({ point: true, disabled: this._isDisabled(this.sequences![seqIndex].label) })}
                    cx=${x}
                    cy=${y}
                    r=${this._getSVGPixel(2)}
                    stroke=${this.colors[seqIndex]}
                    @pointermove=${(evt: PointerEvent) => this.#onPointMove(evt, seqIndex, pointIndex)}
                    @pointerout=${this.#onPointOut}
                  />
                `,
              )
            : '',
        )}
      </svg>
    `;
  };
}
