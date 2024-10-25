import type { Emitter } from '@mantou/gem/lib/decorators';
import {
  adoptedStyle,
  customElement,
  globalemitter,
  property,
  part,
  aria,
  shadow,
  memo,
} from '@mantou/gem/lib/decorators';
import { GemElement, html, createCSSSheet, createState } from '@mantou/gem/lib/element';

import { Time, parseNarrowRelativeTime, parseNarrowTimeRange } from '../lib/time';
import { theme } from '../lib/theme';
import { isNullish } from '../lib/types';

import './date-panel';
import './button';
import './action-text';
import './divider';

export type DateRangeValue = string | number[];

const style = createCSSSheet`
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
`;

type State = {
  start?: number;
  stop?: number;
  hover?: number;
};

@customElement('dy-date-range-panel')
@adoptedStyle(style)
@aria({ role: 'widget' })
@shadow()
export class DuoyunDateRangePanelElement extends GemElement {
  @part static panel: string;

  @property value?: DateRangeValue;
  @globalemitter change: Emitter<number[]>;

  #state = createState<State>({});

  @memo((i) => [i.value])
  #updateState = () => {
    if (Array.isArray(this.value)) {
      return this.#state({ start: this.value[0], stop: this.value[1] });
    }
    if (typeof this.value === 'string') {
      const parsed = parseNarrowRelativeTime(this.value);
      if (parsed) {
        return this.#state({ start: parsed.startOf('d').valueOf(), stop: new Time().valueOf() });
      }
      const range = parseNarrowTimeRange(this.value);
      if (range) {
        return this.#state({ start: range[0].startOf('d').valueOf(), stop: range[1].valueOf() });
      }
    }
  };

  #onSelect = (evt: CustomEvent<number>) => {
    evt.stopPropagation();
    const { start, stop } = this.#state;
    if (isNullish(start) || (!isNullish(start) && !isNullish(stop))) {
      this.#state({ start: evt.detail, stop: undefined });
    } else {
      this.#state({ stop: evt.detail });
      this.change([Math.min(start, evt.detail), Math.max(start, evt.detail)]);
    }
  };

  #onDateHover = ({ detail }: CustomEvent<number>) => {
    this.#state({ hover: detail });
  };

  render = () => {
    const { start, stop, hover } = this.#state;
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
