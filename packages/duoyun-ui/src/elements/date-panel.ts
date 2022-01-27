import {
  adoptedStyle,
  customElement,
  emitter,
  globalemitter,
  Emitter,
  property,
  boolattribute,
} from '@mantou/gem/lib/decorators';
import { GemElement, html } from '@mantou/gem/lib/element';
import { createCSSSheet, css } from '@mantou/gem/lib/utils';

import { isNotNullish } from '../lib/types';
import { theme } from '../lib/theme';
import { Time } from '../lib/time';
import { icons } from '../lib/icons';
import { commonHandle } from '../lib/hotkeys';
import { focusStyle } from '../lib/styles';

import '@mantou/gem/elements/use';
import './calendar';
import './divider';
import './time-panel';

const style = createCSSSheet(css`
  :host {
    font-size: 0.875em;
    display: flex;
    border: 1px solid ${theme.borderColor};
    border-radius: ${theme.normalRound};
    gap: 0.5em;
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
    max-width: 10%;
  }
  .button:hover {
    background-color: ${theme.hoverBackgroundColor};
  }
  .calendar {
    gap: 3px 1px;
  }
  .separate {
    color: ${theme.lightBackgroundColor};
    margin-inline: 0.5em;
  }
  .timepanelwrap {
    width: 0;
    flex-grow: 10;
    display: flex;
    flex-direction: column;
  }
  .time {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 3em;
  }
  .timepanel {
    height: 0;
    flex-grow: 1;
  }
`);

type State = {
  year: number;
  month: number;
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
  @boolattribute time: boolean;
  @globalemitter change: Emitter<number>;
  @emitter datehover: Emitter<number>;

  @property value?: number;
  @property highlights?: number[][];

  @property initValue?: number;

  get #currentPosition() {
    return new Time(`${this.state.year}-${String(this.state.month + 1).padStart(2, '0')}`);
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
    super();
    this.internals.role = 'widget';
  }

  state: State = {
    year: 0,
    month: 0,
  };

  #increaseView = (number: number) => {
    const date = this.#currentPosition.add(number, 'M');
    this.#initState(date.valueOf());
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

  willMount = () => {
    this.#initState(isNotNullish(this.value) ? this.value : this.initValue || Time.now());
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
    return html`
      <div class="datepanel">
        <div class="head">
          <gem-use
            class="button"
            tabindex="0"
            role="button"
            @keydown=${commonHandle}
            @click=${() => this.#increaseView(-1)}
            .element=${icons.left}
          ></gem-use>
          <div class="current">${this.#currentPosition.format({ year: 'numeric', month: 'long' })}</div>
          <gem-use
            class="button"
            tabindex="0"
            role="button"
            @keydown=${commonHandle}
            @click=${() => this.#increaseView(1)}
            .element=${icons.right}
          ></gem-use>
        </div>
        <dy-calendar
          class="calendar"
          borderless
          today
          .position=${this.#currentPosition.valueOf()}
          .highlights=${this.#highlights}
          @datehover=${({ detail }: CustomEvent<number>) => this.datehover(detail)}
          @dateclick=${this.#onChange}
        ></dy-calendar>
      </div>
      ${this.time
        ? html`
            <dy-divider class="separate" orientation="vertical"></dy-divider>
            <div class="timepanelwrap">
              <div class="time">${isNotNullish(this.value) ? new Time(this.value).format('HH:mm:ss') : ''}</div>
              <dy-divider class="separate"></dy-divider>
              <dy-time-panel class="timepanel" .value=${this.value} @change=${this.#onTimeChange}></dy-time-panel>
            </div>
          `
        : ''}
    `;
  };
}
