import {
  adoptedStyle,
  customElement,
  emitter,
  globalemitter,
  Emitter,
  property,
  boolattribute,
  part,
} from '@mantou/gem/lib/decorators';
import { GemElement, html } from '@mantou/gem/lib/element';
import { createCSSSheet, css, classMap, exportPartsMap } from '@mantou/gem/lib/utils';

import { isNotNullish } from '../lib/types';
import { theme } from '../lib/theme';
import { Time } from '../lib/time';
import { icons } from '../lib/icons';
import { commonHandle } from '../lib/hotkeys';
import { focusStyle } from '../lib/styles';

import { DuoyunCalendarElement } from './calendar';

import './use';
import './divider';
import './action-text';
import './time-panel';

const style = createCSSSheet(css`
  :host(:where(:not([hidden]))) {
    font-size: 0.875em;
    display: flex;
    border: 1px solid ${theme.borderColor};
    border-radius: ${theme.normalRound};
    gap: 0.5em;
    overflow: hidden;
  }
  .datepanel {
    width: 0;
    flex-grow: 20;
  }
  .head {
    aspect-ratio: 7 / 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .current {
    flex-grow: 1;
    text-align: center;
  }
  .button {
    aspect-ratio: 1;
    height: 100%;
    border-radius: ${theme.smallRound};
  }
  .button::part(icon) {
    padding: 17%;
  }
  .button:hover {
    background-color: ${theme.hoverBackgroundColor};
  }
  .container {
    position: relative;
  }
  .calendar {
    gap: 3px 1px;
  }
  .calendar.hidden {
    visibility: hidden;
  }
  .calendar::part(no-highlight-cell) {
    border-radius: ${theme.smallRound};
  }
  .calendar::part(start-highlight-cell) {
    border-start-start-radius: ${theme.smallRound};
    border-end-start-radius: ${theme.smallRound};
  }
  .calendar::part(stop-highlight-cell) {
    border-start-end-radius: ${theme.smallRound};
    border-end-end-radius: ${theme.smallRound};
  }
  .list {
    position: absolute;
    inset: 0;
    display: grid;
    grid: auto-flow / 1fr 1fr 1fr;
  }
  .item {
    position: relative;
    display: grid;
    place-items: center;
    border-radius: ${theme.smallRound};
  }
  .item.highlight::after {
    content: '';
    position: absolute;
    border-radius: inherit;
    inset: 0.5em;
    border: 1px solid ${theme.highlightColor};
  }
  .item:hover {
    background: ${theme.hoverBackgroundColor};
  }
  .separate {
    color: ${theme.lightBackgroundColor};
    margin-inline: 0.5em;
  }
  .timepanelwrap {
    width: 0;
    flex-grow: 14;
    display: flex;
    flex-direction: column;
  }
  .time {
    display: grid;
    place-items: center;
    height: 3em;
  }
  .timepanel {
    height: 0;
    flex-grow: 1;
  }
`);

const modes = ['day', 'month', 'year'] as const;

type Mode = (typeof modes)[number];

type State = {
  year: number;
  month: number;
  mode: Mode;
  old?: {
    year: number;
    month: number;
  };
};

/**
 * @customElement dy-date-panel
 * @attr time
 * @fires change
 * @fires datehover
 */
@customElement('dy-date-panel')
@adoptedStyle(style)
@adoptedStyle(focusStyle)
export class DuoyunDatePanelElement extends GemElement<State> {
  @part static dayCell: string;

  @boolattribute time: boolean;
  @globalemitter change: Emitter<number>;
  @emitter datehover: Emitter<number>;

  @property value?: number;
  @property highlights?: number[][];

  @property initValue?: number;

  get #currentPosition() {
    return new Time(`${this.state.year}-${String(this.state.month + 1).padStart(2, '0')}`);
  }

  get #prevPosition() {
    if (!this.state.old) return 0;
    return new Time(`${this.state.old.year}-${String(this.state.old.month + 1).padStart(2, '0')}`);
  }

  get #highlights() {
    const highlights = [...(this.highlights || [])];
    const value = this.value;
    if (isNotNullish(value) && !highlights.some(([start, stop]) => value >= start && value <= stop)) {
      const t = new Time(value);
      highlights.push([t.startOf('d').valueOf(), t.endOf('d').valueOf()]);
    }
    return highlights;
  }

  constructor() {
    super({ delegatesFocus: true });
    this.internals.role = 'widget';
  }

  state: State = {
    year: 0,
    month: 0,
    mode: 'day',
  };

  #increaseView = (number: number) => {
    const date = this.#currentPosition;
    switch (this.state.mode) {
      case 'day':
        date.add(number, 'M');
        break;
      case 'month':
        date.add(number, 'Y');
        break;
      case 'year':
        date.add(number * 12, 'Y');
        break;
    }
    this.#initState(date.valueOf());
  };

  #onChangeView = (state: Partial<State>) => {
    this.setState({ ...state, mode: 'day' });
  };

  #initState = (value: number) => {
    const d = new Time(value);
    this.setState({ year: d.getFullYear(), month: d.getMonth() });
  };

  #onChange = (evt: CustomEvent<number>) => {
    evt.stopPropagation();
    const v = new Time(evt.detail);
    if (this.time) {
      const t = new Time(isNotNullish(this.value) ? this.value : new Time().startOf('d'));
      v.setHours(t.getHours());
      v.setMinutes(t.getMinutes());
      v.setSeconds(t.getSeconds());
    }
    this.#initState(v.valueOf());
    this.change(v.valueOf());
  };

  #onTimeChange = (evt: CustomEvent<number>) => {
    evt.stopPropagation();
    this.#initState(evt.detail);
    this.change(evt.detail);
  };

  #renderCurrentPosition = () => {
    switch (this.state.mode) {
      case 'day':
        return html`${this.#currentPosition.formatToParts().map(({ type, value }) => {
          if (modes.includes(type as any)) {
            const mode = type as Mode;
            return html`<dy-action-text @click=${() => this.setState({ mode })}>${value}</dy-action-text>`;
          }
          return value;
        })}`;
      default:
        return html`
          <dy-action-text @click=${() => this.setState({ mode: 'day' })}>
            ${this.#currentPosition.format('YYYY')}
          </dy-action-text>
        `;
    }
  };

  #renderMonthList = () => {
    const start = new Time().startOf('Y');
    const isCurrentYear = isNotNullish(this.value) && new Time(this.value).getFullYear() === this.state.year;
    return html`
      <div class="list">
        ${Array.from({ length: 12 }).map(
          (_, index) => html`
            <span
              tabindex="0"
              role="button"
              @keydown=${commonHandle}
              class=${classMap({
                item: true,
                highlight: isCurrentYear && index === this.state.month,
              })}
              @click=${() => this.#onChangeView({ month: index })}
            >
              ${Object.fromEntries(
                new Time(start)
                  .add(index, 'M')
                  .formatToParts()
                  .map(({ type, value }) => [type, value]),
              ).month}
            </span>
          `,
        )}
      </div>
    `;
  };

  #renderYearList = () => {
    const currentYear = isNotNullish(this.value) && new Time(this.value).getFullYear();
    return html`
      <div class="list">
        ${Array.from({ length: 12 }, (_, index) => this.state.year - 7 + index).map(
          (year) => html`
            <span
              tabindex="0"
              role="button"
              @keydown=${commonHandle}
              class=${classMap({
                item: true,
                highlight: currentYear === year,
              })}
              @click=${() => this.#onChangeView({ year })}
            >
              ${year}
            </span>
          `,
        )}
      </div>
    `;
  };

  willMount = () => {
    this.#initState(isNotNullish(this.value) ? this.value : this.initValue || Time.now());
    this.memo(
      () => {
        if (this.state.mode !== 'day') {
          this.state.old = {
            month: this.state.month,
            year: this.state.year,
          };
        } else {
          this.state.old = undefined;
        }
      },
      () => [this.state.mode],
    );
  };

  mounted = () => {
    this.effect(
      () => {
        if (isNotNullish(this.initValue)) this.#initState(this.initValue);
      },
      () => [this.initValue],
    );
  };

  render = () => {
    const { mode } = this.state;
    return html`
      <div class="datepanel">
        <div class="head">
          <dy-use
            class="button"
            tabindex="0"
            role="button"
            @keydown=${commonHandle}
            @click=${() => this.#increaseView(-1)}
            .element=${icons.left}
          ></dy-use>
          <div class="current">${this.#renderCurrentPosition()}</div>
          <dy-use
            class="button"
            tabindex="0"
            role="button"
            @keydown=${commonHandle}
            @click=${() => this.#increaseView(1)}
            .element=${icons.right}
          ></dy-use>
        </div>
        <div class="container">
          <dy-calendar
            class=${classMap({ calendar: true, hidden: mode !== 'day' })}
            borderless
            today
            exportparts=${exportPartsMap({ [DuoyunDatePanelElement.dayCell]: DuoyunCalendarElement.dayCell })}
            .position=${mode === 'day' ? this.#currentPosition.valueOf() : this.#prevPosition.valueOf()}
            .highlights=${this.#highlights}
            @datehover=${({ detail }: CustomEvent<number>) => this.datehover(detail)}
            @dateclick=${this.#onChange}
          ></dy-calendar>
          ${mode === 'month' ? this.#renderMonthList() : ''} ${mode === 'year' ? this.#renderYearList() : ''}
        </div>
      </div>
      ${this.time
        ? html`
            <dy-divider class="separate" orientation="vertical"></dy-divider>
            <div class="timepanelwrap">
              <div class="time">${isNotNullish(this.value) ? new Time(this.value).format('HH:mm:ss') : '-:-:-'}</div>
              <dy-divider class="separate"></dy-divider>
              <dy-time-panel
                class="timepanel"
                .value=${this.value}
                @change=${this.#onTimeChange}
                headless
              ></dy-time-panel>
            </div>
          `
        : ''}
    `;
  };
}
