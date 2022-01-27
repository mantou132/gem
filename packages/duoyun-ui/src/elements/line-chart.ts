import { adoptedStyle, customElement } from '@mantou/gem/lib/decorators';
import { html, svg } from '@mantou/gem/lib/element';
import { createCSSSheet, css } from '@mantou/gem/lib/utils';

import { isNullish } from '../lib/types';
import { theme } from '../lib/theme';

import { DuoyunBarChartElement } from './bar-chart';

const style = createCSSSheet(css``);

/**
 * @customElement dy-line-chart
 */
@customElement('dy-line-chart')
@adoptedStyle(style)
export class DuoyunLineChartElement extends DuoyunBarChartElement {
  // not support stack
  #genPath = (values: (number | null)[]) => {
    return values
      .map((value, i) => {
        if (isNullish(value) || (isNullish(values[i - 1]) && isNullish(values[i + 1]))) return '';
        return `${isNullish(values[i - 1]) ? 'M' : `L`}${(i + 0.5) / this.xAxiUnit} ${
          this.stageHeight - ((value || 0) + this.yAxiMin) / this.yAxiUnit
        }`;
      })
      .join(``);
  };

  render = () => {
    if (this.loading) return this.renderLoading();
    if (this.noData) return this.renderNotData();
    if (!this.contentRect.width || !this.sequences || !this.series) return html``;
    return html`
      <style>
        .line,
        .symbol {
          pointer-events: none;
        }
        .hover:hover ~ .line {
          stroke: ${theme.borderColor};
          stroke-dasharray: ${`${this.getSVGPixel(4)} ${this.getSVGPixel(1.5)}`};
        }
        .symbol {
          stroke-width: ${this.getSVGPixel(1)};
          r: ${this.getSVGPixel(2)};
          fill: ${theme.backgroundColor};
        }
        .hover:hover ~ .symbol {
          r: ${this.getSVGPixel(3)};
        }
      </style>
      ${svg`
        <svg aria-hidden="true" part="svg" xmlns="http://www.w3.org/2000/svg" viewBox=${this.viewBox.join(' ')}>
          ${this.renderXAxi({ centerLabel: true })}
          ${this.renderYAxi()}
          ${this.sequences.map(
            ({ values }, index) => svg`
              <path
                stroke=${this.colors[index]}
                fill="none"
                stroke-width=${this.getSVGPixel(1)}
                d=${this.#genPath(values)}
              ></path>
            `,
          )}
          ${this.series.map(
            (_value, index, _, x = (index + 0.5) / this.xAxiUnit) => svg`
              <g>
                <rect
                  @mousemove=${(evt: MouseEvent) => this.onMouseMove(index, evt, true)}
                  @mouseout=${this.onMouseOut}
                  @click=${() => this.indexclick(index)}
                  class="hover"
                  fill="transparent"
                  x=${index / this.xAxiUnit}
                  y=${0}
                  width=${1 / this.xAxiUnit}
                  height=${this.stageHeight}
                />
                ${this.sequences!.map(({ values }, i, _, value = values[index]) =>
                  isNullish(value)
                    ? ''
                    : svg`
                    <circle
                      class="symbol"
                      stroke=${this.colors[i]}
                      cx=${x}
                      cy=${this.stageHeight - (value + this.yAxiMin) / this.yAxiUnit}
                    />
                  `,
                )}
                <path
                  class="line"
                  fill="none"
                  stroke-width=${this.getSVGPixel(1)}
                  d=${`M${x} 0L${x} ${this.stageHeight}`}
                ></path>
              </g>
            `,
          )}
          ${this.renderMarkLines()}
        </svg>
      `}
    `;
  };
}
