import { adoptedStyle, customElement } from '@mantou/gem/lib/decorators';
import { html, svg, createCSSSheet } from '@mantou/gem/lib/element';
import { css } from '@mantou/gem/lib/utils';
import { createDecoratorTheme } from '@mantou/gem/helper/theme';

import { isNullish } from '../lib/types';
import { theme } from '../lib/theme';

import { DuoyunBarChartElement } from './bar-chart';

const elementTheme = createDecoratorTheme({ strokeWidth: 0, strokeDasharray: '' });

const style = createCSSSheet(css`
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
`);

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

  @elementTheme()
  #theme = () => ({
    strokeWidth: this.getSVGPixel(1),
    strokeDasharray: `${this.getSVGPixel(4)} ${this.getSVGPixel(1.5)}`,
  });

  render = () => {
    if (this.loading) return this.renderLoading();
    if (this.noData) return this.renderNotData();
    if (!this.contentRect.width || !this.sequences || !this.series) return html``;
    return svg`
      <svg aria-hidden="true" part=${
        DuoyunBarChartElement.chart
      } xmlns="http://www.w3.org/2000/svg" viewBox=${this.viewBox.join(' ')}>
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
            <g class="col" @click=${() => this.indexclick(index)}>
              <rect
                @mousemove=${(evt: MouseEvent) => this.onMouseMove(index, evt, true)}
                @mouseout=${this.onMouseOut}
                class="hover"
                fill="transparent"
                x=${index / this.xAxiUnit}
                y=${0}
                width=${1 / this.xAxiUnit}
                height=${this.stageHeight}
              />
              ${this.sequences!.map(({ values }, i, __, value = values[index]) =>
                isNullish(value)
                  ? ''
                  : svg`
                  <circle
                    @mousemove=${(evt: MouseEvent) => this.onMouseMove(index, evt, true, i)}
                    class="symbol"
                    stroke=${this.colors[i]}
                    r=${this.getSVGPixel(2)}
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
    `;
  };
}
