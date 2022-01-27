import { adoptedStyle, customElement, emitter, Emitter, property } from '@mantou/gem/lib/decorators';
import { GemElement, html } from '@mantou/gem/lib/element';
import { createCSSSheet, css, styleMap, classMap } from '@mantou/gem/lib/utils';
import type { PanEventDetail } from '@mantou/gem/elements/gesture';

import { clamp } from '../lib/number';
import { theme } from '../lib/theme';

import '@mantou/gem/elements/gesture';
import './area-chart';

const style = createCSSSheet(css`
  :host {
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
  .grabing {
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
`);

type State = {
  grabing: boolean;
  newValue?: number[];
};

/**
 * @customElement dy-chart-zoom
 */
@customElement('dy-chart-zoom')
@adoptedStyle(style)
export class DuoyunChartZoomElement extends GemElement<State> {
  @property values?: (number | null)[][];
  @property value = [0, 1];
  @emitter change: Emitter<number[]>;

  state: State = {
    grabing: false,
  };

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
    let [start, stop] = this.value;
    if (isStop) [stop, start] = [start, stop];
    const movement = this.#getMovement(detail);
    const newStart = clamp(0, start + movement, 1);
    const newValue = [Math.min(newStart, stop), Math.max(newStart, stop)];
    if (newValue[1] - newValue[0] < 0.01) return this.#panAdjust(this.value, detail);
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
    this.setState({ newValue: [v, v] });
  };

  #onNewChange = ({ detail }: CustomEvent<PanEventDetail>) => {
    const v = this.#getCurrent(detail.clientX);
    this.setState({ newValue: [this.state.newValue![0], v] });
  };

  #onNewEnd = () => {
    const { newValue } = this.state;
    this.change([Math.min(...newValue!), Math.max(...newValue!)]);
    this.setState({ newValue: undefined });
  };

  #onGrabStart = () => {
    this.setState({ grabing: true });
  };

  #onPan = ({ detail }: CustomEvent<PanEventDetail>) => {
    const newValue = this.#panAdjust(this.value, detail);
    this.change(newValue);
  };

  #onGrabEnd = () => {
    this.setState({ grabing: false });
  };

  render = () => {
    const { grabing, newValue } = this.state;
    const [start, stop] = this.value;
    return html`
      <dy-area-chart
        .stageHeight=${12}
        .colors=${[theme.informativeColor]}
        .xAxi=${null}
        .yAxi=${null}
        .sequences=${this.values && [{ label: '', values: this.values }]}
      ></dy-area-chart>
      <gem-gesture class="bg" @pointerdown=${this.#onNewStart} @pan=${this.#onNewChange} @end=${this.#onNewEnd}>
        ${newValue
          ? html`
              <div
                class="new-range"
                style=${styleMap({
                  left: `calc(${Math.min(...newValue) * 100}% - 1px)`,
                  right: `calc(${(1 - Math.max(...newValue)) * 100}% - 2px)`,
                })}
              ></div>
            `
          : ''}
      </gem-gesture>
      <div
        class=${classMap({ range: true, grabing })}
        style=${styleMap({ left: `calc(${start * 100}% - 1px)`, right: `calc(${(1 - stop) * 100}% - 2px)` })}
      >
        <gem-gesture
          class=${classMap({ grab: true, grabing })}
          @pointerdown=${this.#onGrabStart}
          @pan=${this.#onPan}
          @end=${this.#onGrabEnd}
        ></gem-gesture>
        <gem-gesture
          class="crosshair"
          @pointerdown=${this.#onNewStart}
          @pan=${this.#onNewChange}
          @end=${this.#onNewEnd}
        ></gem-gesture>
        <gem-gesture class="start" @pan=${this.#onPanStart}></gem-gesture>
        <gem-gesture class="stop" @pan=${this.#onPanStop}></gem-gesture>
      </div>
    `;
  };
}
