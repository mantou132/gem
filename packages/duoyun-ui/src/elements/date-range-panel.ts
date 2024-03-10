import { adoptedStyle, customElement, globalemitter, Emitter, property, part } from '@mantou/gem/lib/decorators';
import { GemElement, html } from '@mantou/gem/lib/element';
import { createCSSSheet, css } from '@mantou/gem/lib/utils';

import { Time, parseNarrowRelativeTime, parseNarrowTimeRange } from '../lib/time';
import { theme } from '../lib/theme';
import { isNullish } from '../lib/types';

import './date-panel';
import './button';
import './action-text';
import './divider';

export type DateRangeValue = string | number[];

const style = createCSSSheet(css`
  :host(:where(:not([hidden]))) {
    display: flex;
    align-items: flex-start;
  }
  .panel {
    width: 100%;
    flex-shrink: 1;
    border: none;
  }
  .panel::part(day-cell) {
    transition: none;
  }
  .separate {
    color: ${theme.lightBackgroundColor};
    margin-inline: 0.5em;
  }
`);

type State = {
  start?: number;
  stop?: number;
  hover?: number;
};

/**
 * @customElement dy-date-range-panel
 */
@customElement('dy-date-range-panel')
@adoptedStyle(style)
export class DuoyunDateRangePanelElement extends GemElement<State> {
  @part static panel: string;

  @property value?: DateRangeValue;
  @globalemitter change: Emitter<number[]>;

  constructor() {
    super();
    this.internals.role = 'widget';
  }

  state: State = {};

  #onSelect = (evt: CustomEvent<number>) => {
    evt.stopPropagation();
    const { start, stop } = this.state;
    if (isNullish(start) || (!isNullish(start) && !isNullish(stop))) {
      this.setState({ start: evt.detail, stop: undefined });
    } else {
      this.setState({ stop: evt.detail });
      this.change([Math.min(start, evt.detail), Math.max(start, evt.detail)]);
    }
  };

  #onDateHover = ({ detail }: CustomEvent<number>) => {
    this.setState({ hover: detail });
  };

  willMount = () => {
    this.memo(
      () => {
        if (Array.isArray(this.value)) {
          return this.setState({ start: this.value[0], stop: this.value[1] });
        }
        if (typeof this.value === 'string') {
          const parsed = parseNarrowRelativeTime(this.value);
          if (parsed) {
            return this.setState({ start: parsed.startOf('d').valueOf(), stop: new Time().valueOf() });
          }
          const range = parseNarrowTimeRange(this.value);
          if (range) {
            return this.setState({ start: range[0].startOf('d').valueOf(), stop: range[1].valueOf() });
          }
        }
      },
      () => [this.value],
    );
  };

  render = () => {
    const { start, stop, hover } = this.state;
    const highlightStop = stop || hover;
    const highlights: number[][] =
      !isNullish(start) && highlightStop ? [[Math.min(start, highlightStop), Math.max(start, highlightStop)]] : [];
    const isSomeMonth = !isNullish(start) && !isNullish(stop) && new Time(start).isSame(stop, 'M');
    return html`
      <dy-date-panel
        class="panel"
        part=${DuoyunDateRangePanelElement.panel}
        @change=${this.#onSelect}
        @datehover=${this.#onDateHover}
        .value=${start}
        .highlights=${highlights}
        .initValue=${isNullish(start)
          ? new Time().subtract(1, 'M').valueOf()
          : isSomeMonth
            ? new Time(start).subtract(1, 'M').valueOf()
            : undefined}
      ></dy-date-panel>
      <dy-divider class="separate" orientation="vertical"></dy-divider>
      <dy-date-panel
        class="panel"
        part=${DuoyunDateRangePanelElement.panel}
        @change=${this.#onSelect}
        @datehover=${this.#onDateHover}
        .value=${stop}
        .highlights=${highlights}
        .initValue=${isSomeMonth ? start : undefined}
      ></dy-date-panel>
    `;
  };
}
