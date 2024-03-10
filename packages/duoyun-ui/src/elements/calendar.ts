import {
  adoptedStyle,
  customElement,
  emitter,
  Emitter,
  property,
  boolattribute,
  part,
} from '@mantou/gem/lib/decorators';
import { GemElement, html, TemplateResult } from '@mantou/gem/lib/element';
import { createCSSSheet, css, classMap, partMap } from '@mantou/gem/lib/utils';

import { isNotNullish } from '../lib/types';
import { Time } from '../lib/time';
import { theme } from '../lib/theme';
import { commonHandle } from '../lib/hotkeys';
import { focusStyle } from '../lib/styles';

const style = createCSSSheet(css`
  :host(:where(:not([hidden]))) {
    cursor: default;
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
    transition: background 0.1s;
  }
  .day:where(:hover) {
    background: ${theme.hoverBackgroundColor};
  }
  .leftBottom {
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
  @part static headerRow: string;
  @part static headerLeftCell: string;
  @part static headerRightCell: string;
  @part static dayCell: string;
  @part static todayCell: string;
  @part static otherDayCell: string;
  @part static leftTopCell: string;
  @part static rightTopCell: string;
  @part static leftBottomCell: string;
  @part static rightBottomCell: string;
  @part static highlightCell: string;
  @part static noHighlightCell: string;
  @part static startHighlightCell: string;
  @part static stopHighlightCell: string;
  @part static date: string;
  @part static todayDate: string;

  @emitter datehover: Emitter<number>;
  @emitter dateclick: Emitter<number>;
  @boolattribute borderless: boolean;
  @boolattribute today: boolean;

  @property position?: number;
  @property highlights?: number[][];
  @property renderDate?: (date: Time) => TemplateResult;

  constructor() {
    super({ delegatesFocus: true });
  }

  #isHighlightRange = (date: Time) => {
    const t = date.valueOf();
    return !!this.highlights?.some(([start, stop]) => t >= start && t <= stop);
  };

  #isStartHighlight = (date: Time) => {
    return !!this.highlights?.some(([d]) => date.isSame(d, 'd'));
  };

  #isStopHighlight = (date: Time) => {
    return !!this.highlights?.some((ds) => date.isSame(ds[ds.length - 1], 'd'));
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
          dates.push({ date: new Time(s), isThisMonth: true, isToday: today.isSame(s, 'd') });
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
        ({ date }, index) => html`
          <div
            class="head"
            part=${partMap({
              [DuoyunCalendarElement.headerRow]: true,
              [DuoyunCalendarElement.headerLeftCell]: index === 0,
              [DuoyunCalendarElement.headerRightCell]: index === 6,
            })}
          >
            ${date.format({ weekday: 'narrow' })}
          </div>
        `,
      )}
      ${this.#dates.map(
        (
          { date, isThisMonth, isToday },
          index,
          arr,
          leftBottomCell = index === arr.length - 7,
          rightBottomCell = index === arr.length - 1,
          start = !!isThisMonth && this.#isStartHighlight(date),
          stop = !!isThisMonth && this.#isStopHighlight(date),
          highlight = !!isThisMonth && (start || stop || this.#isHighlightRange(date)),
        ) => html`
          <div
            tabindex="0"
            role="button"
            part=${partMap({
              [DuoyunCalendarElement.dayCell]: true,
              [DuoyunCalendarElement.todayCell]: !!isToday,
              [DuoyunCalendarElement.otherDayCell]: !isThisMonth,
              [DuoyunCalendarElement.leftTopCell]: index === 0,
              [DuoyunCalendarElement.rightTopCell]: index === 6,
              [DuoyunCalendarElement.leftBottomCell]: leftBottomCell,
              [DuoyunCalendarElement.rightBottomCell]: rightBottomCell,
              [DuoyunCalendarElement.startHighlightCell]: start,
              [DuoyunCalendarElement.stopHighlightCell]: stop,
              [DuoyunCalendarElement.highlightCell]: highlight,
              [DuoyunCalendarElement.noHighlightCell]: !highlight,
            })}
            class=${classMap({
              day: true,
              highlight,
              leftBottom: leftBottomCell,
              today: this.today && !!isToday,
              other: !isThisMonth,
            })}
            @click=${() => this.dateclick(date.valueOf())}
            @mouseover=${() => this.datehover(date.valueOf())}
            @keydown=${commonHandle}
          >
            <span
              part=${partMap({
                [DuoyunCalendarElement.date]: true,
                [DuoyunCalendarElement.todayDate]: !!isToday,
              })}
            >
              ${date.getDate()}
            </span>
            ${this.renderDate?.(date)}
          </div>
        `,
      )}
    `;
  };
}
