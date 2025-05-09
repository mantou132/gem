import type { Emitter } from '@mantou/gem/lib/decorators';
import { adoptedStyle, customElement, emitter, mounted, property, shadow } from '@mantou/gem/lib/decorators';
import { createState, css, GemElement, html } from '@mantou/gem/lib/element';
import { addListener, classMap, styleMap } from '@mantou/gem/lib/utils';

import { clamp } from '../lib/number';
import { theme } from '../lib/theme';
import type { PanEventDetail } from './gesture';

import './gesture';
import './area-chart';

const style = css`
  :host(:where(:not([hidden]))) {
    position: relative;
    display: block;
    border-radius: ${theme.normalRound};
    border: 1px solid ${theme.borderColor};
  }
  dy-area-chart {
    aspect-ratio: 30;
    pointer-events: none;
    opacity: 0.4;
    background: ${theme.lightBackgroundColor};
  }
  .bg {
    cursor: crosshair;
    position: absolute;
    inset: 0;
  }
  .new-range,
  .range {
    position: absolute;
    height: 100%;
    top: 0;
    bottom: 0;
    background: #2680eb22;
    border: 1px solid ${theme.describeColor};
    border-width: 0 1px;
    border-radius: inherit;
  }
  .grab {
    cursor: grab;
    height: 50%;
  }
  .crosshair {
    cursor: crosshair;
    height: 50%;
  }
  .grabbing {
    cursor: grabbing;
  }
  .start,
  .stop {
    cursor: col-resize;
    position: absolute;
    top: 50%;
    background: ${theme.backgroundColor};
    height: 1em;
    width: 3px;
    border-radius: 10em;
    border: 1px solid ${theme.describeColor};
  }
  .start {
    left: 0;
    transform: translate(-50%, -50%);
  }
  .stop {
    right: 0;
    transform: translate(50%, -50%);
  }
`;

@customElement('dy-chart-zoom')
@adoptedStyle(style)
@shadow()
export class DuoyunChartZoomElement extends GemElement {
  @property values?: (number | null)[][];
  @property value?: number[];
  @property aspectRatio?: number;
  @emitter change: Emitter<number[]>;

  #defaultValue = [0, 1];
  get #value() {
    return this.value || this.#defaultValue;
  }

  get #aspectRatio() {
    return this.aspectRatio || 25;
  }

  #state = createState({
    grabbing: false,
    newValue: undefined as number[] | undefined,
  });

  #getMovement = (detail: PanEventDetail) => {
    const { left, right, width } = this.getBoundingClientRect();
    if (detail.clientX < left || detail.clientX > right) return 0;
    return detail.x / width;
  };

  #getCurrent = (clientX: number) => {
    const { left, width } = this.getBoundingClientRect();
    return clamp(0, (clientX - left) / width, 1);
  };

  #panAdjust = ([start, stop]: number[], detail: PanEventDetail) => {
    const movement = this.#getMovement(detail);
    const m = movement < 0 ? Math.max(0 - start, movement) : Math.min(1 - stop, movement);
    return [start + m, stop + m];
  };

  #adjust = (detail: PanEventDetail, isStop: boolean) => {
    let [start, stop] = this.#value;
    if (isStop) [stop, start] = [start, stop];
    const { left, width } = this.getBoundingClientRect();
    const newStart = clamp(0, (detail.clientX - left) / width, 1);
    const newValue = [Math.min(newStart, stop), Math.max(newStart, stop)];
    if (newValue[1] - newValue[0] < 0.01) return this.#panAdjust(this.#value, detail);
    return newValue;
  };

  #onPanStart = (evt: CustomEvent<PanEventDetail>) => {
    const newValue = this.#adjust(evt.detail, false);
    this.change(newValue);
  };

  #onPanStop = (evt: CustomEvent<PanEventDetail>) => {
    const newValue = this.#adjust(evt.detail, true);
    this.change(newValue);
  };

  #onNewStart = ({ clientX }: PointerEvent) => {
    const v = this.#getCurrent(clientX);
    this.#state({ newValue: [v, v] });
  };

  #onNewChange = ({ detail }: CustomEvent<PanEventDetail>) => {
    const v = this.#getCurrent(detail.clientX);
    this.#state({ newValue: [this.#state.newValue![0], v] });
  };

  #onNewEnd = () => {
    const { newValue } = this.#state;
    this.change([Math.min(...newValue!), Math.max(...newValue!)]);
    this.#state({ newValue: undefined });
  };

  #onGrabStart = () => {
    this.#state({ grabbing: true });
  };

  #onPan = ({ detail }: CustomEvent<PanEventDetail>) => {
    const newValue = this.#panAdjust(this.#value, detail);
    this.change(newValue);
  };

  #onGrabEnd = () => {
    this.#state({ grabbing: false });
  };

  @mounted()
  #init = () => addListener(this, 'dblclick', () => this.change([0, 1]));

  render = () => {
    const { grabbing, newValue } = this.#state;
    const [start, stop] = this.#value;
    return html`
      <dy-area-chart
        role="none"
        .smooth=${Number(this.values?.length) < 100}
        .aspectRatio=${this.#aspectRatio}
        .colors=${[theme.informativeColor]}
        .xAxi=${null}
        .yAxi=${null}
        .sequences=${this.values && [{ label: '', values: this.values }]}
      ></dy-area-chart>
      <dy-gesture class="bg" @pointerdown=${this.#onNewStart} @pan=${this.#onNewChange} @end=${this.#onNewEnd}>
        <div
          v-if=${!!newValue}
          class="new-range"
          style=${styleMap({
            left: `calc(${Math.min(...(newValue || [])) * 100}% - 1px)`,
            right: `calc(${(1 - Math.max(...(newValue || []))) * 100}% - 2px)`,
          })}
        ></div>
      </dy-gesture>
      <div
        class=${classMap({ range: true, grabbing })}
        style=${styleMap({ left: `calc(${start * 100}% - 1px)`, right: `calc(${(1 - stop) * 100}% - 2px)` })}
      >
        <dy-gesture
          class=${classMap({ grab: true, grabbing })}
          @pointerdown=${this.#onGrabStart}
          @pan=${this.#onPan}
          @end=${this.#onGrabEnd}
        ></dy-gesture>
        <dy-gesture
          class="crosshair"
          @pointerdown=${this.#onNewStart}
          @pan=${this.#onNewChange}
          @end=${this.#onNewEnd}
        ></dy-gesture>
        <dy-gesture class="start" @pan=${this.#onPanStart}></dy-gesture>
        <dy-gesture class="stop" @pan=${this.#onPanStop}></dy-gesture>
      </div>
    `;
  };
}
