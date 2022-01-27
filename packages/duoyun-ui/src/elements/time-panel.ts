import { adoptedStyle, customElement, globalemitter, Emitter, property } from '@mantou/gem/lib/decorators';
import { GemElement, html } from '@mantou/gem/lib/element';
import { createCSSSheet, css, classMap } from '@mantou/gem/lib/utils';

import { Time, parseDate } from '../lib/time';
import { theme } from '../lib/theme';
import { isNotNullish } from '../lib/types';

const style = createCSSSheet(css`
  :host {
    display: flex;
    text-align: center;
    line-height: 2;
  }
  .scrollbar {
    flex-grow: 1;
    overflow: auto;
    scrollbar-gutter: both-edges;
  }
  .cell:where(:hover) {
    background: ${theme.lightBackgroundColor};
  }
  .check {
    background: ${theme.hoverBackgroundColor};
  }
`);

/**
 * @customElement dy-time-panel
 */
@customElement('dy-time-panel')
@adoptedStyle(style)
export class DuoyunTimePanelElement extends GemElement {
  @globalemitter change: Emitter<number>;

  @property value?: number;

  get #time() {
    return isNotNullish(this.value) ? new Time(this.value) : new Time();
  }

  get #parts() {
    return isNotNullish(this.value) ? parseDate(this.value) : ({} as Partial<ReturnType<typeof parseDate>>);
  }

  #toArr = (l: number) => Array.from({ length: l }, (_, index) => index);
  #toString = (n: number) => n.toString().padStart(2, '0');

  #onHourClick = (n: number) => {
    this.change(this.#time.setHours(n));
  };

  #onMinuteClick = (n: number) => {
    this.change(this.#time.setMinutes(n));
  };

  #onSecondClick = (n: number) => {
    this.change(this.#time.setSeconds(n));
  };

  render = () => {
    const { hour, minute, second } = this.#parts;
    return html`
      <div class="scrollbar">
        ${this.#toArr(24).map(
          (h) =>
            html`
              <div
                class=${classMap({ cell: true, check: isNotNullish(h) && Number(hour) === h })}
                @click=${() => this.#onHourClick(h)}
              >
                ${this.#toString(h)}
              </div>
            `,
        )}
      </div>
      <div class="scrollbar">
        ${this.#toArr(60).map(
          (m) =>
            html`
              <div
                class=${classMap({ cell: true, check: isNotNullish(m) && Number(minute) === m })}
                @click=${() => this.#onMinuteClick(m)}
              >
                ${this.#toString(m)}
              </div>
            `,
        )}
      </div>
      <div class="scrollbar">
        ${this.#toArr(60).map(
          (s) =>
            html`
              <div
                class=${classMap({ cell: true, check: isNotNullish(s) && Number(second) === s })}
                @click=${() => this.#onSecondClick(s)}
              >
                ${this.#toString(s)}
              </div>
            `,
        )}
      </div>
    `;
  };
}
