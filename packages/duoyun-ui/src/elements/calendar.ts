import { adoptedStyle, customElement, emitter, Emitter, property, boolattribute } from '@mantou/gem/lib/decorators';
import { GemElement, html, TemplateResult } from '@mantou/gem/lib/element';
import { createCSSSheet, css, classMap, partMap } from '@mantou/gem/lib/utils';

import { isNotNullish } from '../lib/types';
import { Time } from '../lib/time';
import { theme } from '../lib/theme';
import { commonHandle } from '../lib/hotkeys';
import { focusStyle } from '../lib/styles';

const style = createCSSSheet(css`
  :host {
    font-size: 0.875em;
    display: grid;
    gap: 1px;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    border-radius: ${theme.normalRound};
    border-color: ${theme.borderColor};
  }
  .day,
  .head {
    aspect-ratio: 1 / 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    margin: -1px;
    border: 1px solid;
    border-color: inherit;
  }
  .head {
    border-block-end-color: ${theme.lightBackgroundColor};
  }
  .head:first-of-type {
    border-start-start-radius: inherit;
  }
  .head:nth-of-type(7) {
    border-start-end-radius: inherit;
  }
  .day {
    position: relative;
    z-index: 1;
  }
  .day:where(:hover) {
    background: ${theme.hoverBackgroundColor};
  }
  [part~='leftbottom'] {
    border-end-start-radius: inherit;
  }
  .day:last-of-type {
    border-end-end-radius: inherit;
  }
  .other {
    z-index: 0;
    color: ${theme.disabledColor};
  }
  .other:where(:hover) {
    background: ${theme.lightBackgroundColor};
  }
  .today {
    z-index: 2;
  }
  .today::before,
  .today::after {
    content: '';
    position: absolute;
    border-radius: inherit;
    margin: -1px;
    border: 1px solid ${theme.backgroundColor};
  }
  .today::before {
    inset: 2px;
  }
  .today::after {
    border-color: ${theme.primaryColor};
    inset: 0;
  }
  .highlight {
    z-index: 2;
    background: ${theme.primaryColor};
    color: ${theme.backgroundColor};
  }
  .start {
    border-start-start-radius: ${theme.smallRound};
    border-end-start-radius: ${theme.smallRound};
  }
  .stop {
    border-start-end-radius: ${theme.smallRound};
    border-end-end-radius: ${theme.smallRound};
  }
  :host([borderless]) {
    border: none;
    padding: 1px;
    border-radius: 0;
    border-color: transparent;
  }
`);

interface Day {
  date: Time;
  isThisMonth?: boolean;
  isToday?: boolean;
}

/**
 * @customElement dy-calendar
 * @attr borderless
 * @attr today
 */
@customElement('dy-calendar')
@adoptedStyle(style)
@adoptedStyle(focusStyle)
export class DuoyunCalendarElement extends GemElement {
  @emitter datehover: Emitter<number>;
  @emitter dateclick: Emitter<number>;
  @boolattribute borderless: boolean;
  @boolattribute today: boolean;

  @property position?: number;
  @property highlights?: number[][];
  @property renderDate?: (date: Time) => TemplateResult;

  #isHighlight = (date: Time) => {
    const t = date.valueOf();
    return !!this.highlights?.some(([start, stop]) => t >= start && t <= stop);
  };

  #dates: Day[];

  willMount = () => {
    this.memo(
      () => {
        const today = new Time();
        const startTime = isNotNullish(this.position) ? new Time(this.position) : today;
        const start = new Time(startTime).startOf('M');
        const startDay = start.getDay();
        const stop = new Time(startTime).endOf('M');
        const stopDay = stop.getDay();
        const dates: Day[] = [];
        for (let i = 0; i < startDay; i++) {
          dates.push({ date: new Time(start).subtract(startDay - i, 'd') });
        }
        let s = start;
        while (s.valueOf() < stop.valueOf()) {
          dates.push({ date: new Time(s), isThisMonth: true, isToday: today.isSome(s, 'd') });
          s = new Time(s).add(1, 'd');
        }
        for (let i = 1; i < 7 - stopDay; i++) {
          dates.push({ date: new Time(stop).add(i, 'd') });
        }
        this.#dates = dates;
      },
      () => [this.position],
    );
  };

  render = () => {
    return html`
      ${this.#dates.slice(0, 7).map(
        ({ date }, index) =>
          html`
            <div
              class="head"
              part=${partMap({
                head: true,
                left: index === 0,
                right: index === 6,
              })}
            >
              ${date.format({ weekday: 'narrow' })}
            </div>
          `,
      )}
      ${this.#dates.map(
        ({ date, isThisMonth, isToday }, index, arr) =>
          html`
            <div
              tabindex="0"
              role="button"
              part=${partMap({
                day: true,
                today: !!isToday,
                other: !isThisMonth,
                lefttop: index === 0,
                righttop: index === 6,
                leftbottom: index === arr.length - 7,
                rightbottom: index === arr.length - 1,
              })}
              class=${classMap(
                isThisMonth
                  ? {
                      day: true,
                      today: this.today && !!isToday,
                      start: !!this.highlights?.some(([d]) => date.isSome(d, 'd')),
                      stop: !!this.highlights?.some((ds) => date.isSome(ds[ds.length - 1], 'd')),
                      highlight: this.#isHighlight(date),
                    }
                  : {
                      day: true,
                      other: true,
                    },
              )}
              @click=${() => this.dateclick(date.valueOf())}
              @mouseover=${() => this.datehover(date.valueOf())}
              @keydown=${commonHandle}
            >
              <span part=${partMap({ date: true, todaydate: !!isToday })}>${date.getDate()}</span>
              ${this.renderDate?.(date)}
            </div>
          `,
      )}
    `;
  };
}
