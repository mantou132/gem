import { adoptedStyle, customElement } from '@mantou/gem/lib/decorators';
import { html, svg, css } from '@mantou/gem/lib/element';
import { createDecoratorTheme } from '@mantou/gem/helper/theme';

import { isNullish } from '../lib/types';
import { theme } from '../lib/theme';

import { DuoyunBarChartElement } from './bar-chart';

const elementTheme = createDecoratorTheme({ strokeWidth: 0, strokeDasharray: '' });

const style = css`
  .line {
    pointer-events: none;
  }
  .symbol {
    stroke-width: ${elementTheme.strokeWidth};
    fill: ${theme.backgroundColor};
  }
  .col:hover .line {
    stroke: ${theme.borderColor};
    stroke-dasharray: ${elementTheme.strokeDasharray};
  }
  .col:hover .symbol {
    transform-box: fill-box;
    transform-origin: center;
    transform: scale(1.5);
  }
`;

@customElement('dy-line-chart')
@adoptedStyle(style)
export class DuoyunLineChartElement extends DuoyunBarChartElement {
  // not support stack
  #genPath = (values: (number | null)[]) => {
    return values
      .map((value, i) => {
        if (isNullish(value) || (isNullish(values[i - 1]) && isNullish(values[i + 1]))) return '';
        return `${isNullish(values[i - 1]) ? 'M' : `L`}${(i + 0.5) / this._xAxiUnit} ${
          this._stageHeight - ((value || 0) + this._yAxiMin) / this._yAxiUnit
        }`;
      })
      .join(``);
  };

  @elementTheme()
  #theme = () => ({
    strokeWidth: this._getSVGPixel(1),
    strokeDasharray: `${this._getSVGPixel(4)} ${this._getSVGPixel(1.5)}`,
  });

  render = () => {
    if (this.loading) return this._renderLoading();
    if (this.noData) return this._renderNotData();
    if (!this.contentRect.width || !this.sequences || !this.series) return html``;
    return svg`
      <svg aria-hidden="true" part=${
        DuoyunBarChartElement.chart
      } xmlns="http://www.w3.org/2000/svg" viewBox=${this._viewBox.join(' ')}>
        ${this._renderXAxi({ centerLabel: true })}
        ${this._renderYAxi()}
        ${this.sequences.map(
          ({ values }, index) => svg`
            <path
              stroke=${this.colors[index]}
              fill="none"
              stroke-width=${this._getSVGPixel(1)}
              d=${this.#genPath(values)}
            ></path>
          `,
        )}
        ${this.series.map(
          (_value, index, _, x = (index + 0.5) / this._xAxiUnit) => svg`
            <g class="col" @click=${() => this.indexclick(index)}>
              <rect
                @mousemove=${(evt: MouseEvent) => this.onMouseMove(index, evt, true)}
                @mouseout=${this.onMouseOut}
                class="hover"
                fill="transparent"
                x=${index / this._xAxiUnit}
                y=${0}
                width=${1 / this._xAxiUnit}
                height=${this._stageHeight}
              />
              ${this.sequences!.map(({ values }, i, __, value = values[index]) =>
                isNullish(value)
                  ? ''
                  : svg`
                  <circle
                    @mousemove=${(evt: MouseEvent) => this.onMouseMove(index, evt, true, i)}
                    class="symbol"
                    stroke=${this.colors[i]}
                    r=${this._getSVGPixel(2)}
                    cx=${x}
                    cy=${this._stageHeight - (value + this._yAxiMin) / this._yAxiUnit}
                  />
                `,
              )}
              <path
                class="line"
                fill="none"
                stroke-width=${this._getSVGPixel(1)}
                d=${`M${x} 0L${x} ${this._stageHeight}`}
              ></path>
            </g>
          `,
        )}
        ${this._renderMarkLines()}
      </svg>
    `;
  };
}
