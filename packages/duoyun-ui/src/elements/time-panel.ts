import type { Emitter } from '@mantou/gem/lib/decorators';
import {
  adoptedStyle,
  boolattribute,
  customElement,
  globalemitter,
  mounted,
  property,
  shadow,
} from '@mantou/gem/lib/decorators';
import { css, GemElement, html } from '@mantou/gem/lib/element';
import { classMap } from '@mantou/gem/lib/utils';

import { locale } from '../lib/locale';
import { focusStyle } from '../lib/styles';
import { theme } from '../lib/theme';
import { parseDate, Time } from '../lib/time';
import { isNotNullish } from '../lib/types';

const style = css`
  :host(:where(:not([hidden]))) {
    display: grid;
    grid-template: 'hour minute second' / 1fr 1fr 1fr;
    gap: 1px;
    text-align: center;
    line-height: 2;
  }
  .header {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding-inline: 0.2em;
  }
  .scrollbar {
    flex-grow: 1;
    overflow: auto;
    scrollbar-width: thin;
    scrollbar-gutter: both-edges;
    scroll-snap-type: y proximity;
  }
  .cell {
    scroll-snap-align: start;
    border-radius: ${theme.smallRound};
    transition: background 0.1s;
  }
  .cell:where(:hover) {
    background: ${theme.lightBackgroundColor};
  }
  .checked {
    background: ${theme.hoverBackgroundColor};
  }
`;

@customElement('dy-time-panel')
@adoptedStyle(style)
@adoptedStyle(focusStyle)
@shadow({ delegatesFocus: true })
export class DuoyunTimePanelElement extends GemElement {
  @boolattribute headless: boolean;
  @globalemitter change: Emitter<number>;

  @property value?: number;

  get #time() {
    return isNotNullish(this.value) ? new Time(this.value) : new Time().startOf('d');
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

  @mounted()
  #init = () => {
    this.shadowRoot?.querySelectorAll(`.checked`).forEach((e) => {
      e.scrollIntoView({ block: 'center' });
    });
  };

  render = () => {
    const { hour, minute, second } = this.#parts;
    return html`
      ${
        this.headless
          ? ''
          : html`
              <div class="header">${locale.hour}</div>
              <div class="header">${locale.minute}</div>
              <div class="header">${locale.second}</div>
            `
      }
      <div class="scrollbar">
        ${this.#toArr(24).map(
          (h) => html`
            <div
              class=${classMap({ cell: true, checked: isNotNullish(h) && Number(hour) === h })}
              @click=${() => this.#onHourClick(h)}
            >
              ${this.#toString(h)}
            </div>
          `,
        )}
      </div>
      <div class="scrollbar">
        ${this.#toArr(60).map(
          (m) => html`
            <div
              class=${classMap({ cell: true, checked: isNotNullish(m) && Number(minute) === m })}
              @click=${() => this.#onMinuteClick(m)}
            >
              ${this.#toString(m)}
            </div>
          `,
        )}
      </div>
      <div class="scrollbar">
        ${this.#toArr(60).map(
          (s) => html`
            <div
              class=${classMap({ cell: true, checked: isNotNullish(s) && Number(second) === s })}
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
