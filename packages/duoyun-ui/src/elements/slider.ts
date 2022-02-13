// https://spectrum.adobe.com/page/slider/
import {
  adoptedStyle,
  customElement,
  attribute,
  globalemitter,
  Emitter,
  boolattribute,
  numattribute,
  refobject,
  RefObject,
} from '@mantou/gem/lib/decorators';
import { GemElement, html } from '@mantou/gem/lib/element';
import { createCSSSheet, css, classMap } from '@mantou/gem/lib/utils';

import { theme } from '../lib/theme';
import { clamp } from '../lib/number';
import { hotkeys } from '../lib/hotkeys';
import { focusStyle } from '../lib/styles';

import type { PanEventDetail } from './gesture';

import './gesture';
import './input';

const style = createCSSSheet(css`
  :host {
    font-size: 0.875em;
    width: 15em;
    --size: 1em;
    --c: calc(var(--size) / 2 + 6px);
    display: inline-flex;
    align-items: center;
    gap: 1em;
    height: calc(2.2em + 2px);
  }
  .slider {
    flex-grow: 1;
    position: relative;
    height: 2px;
    border-radius: 1px;
  }
  .mark {
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
    border-radius: 10em;
    box-sizing: border-box;
    width: var(--size);
    height: var(--size);
    border: 2px solid;
    transition: border-width 0.1s;
    opacity: 0.8;
  }
  .mark:hover {
    opacity: 1;
  }
  :host(:focus-visible) .mark,
  .mark.start {
    border-width: 5px;
  }
  :host([disabled]) .mark {
    cursor: not-allowed;
    background: ${theme.disabledColor};
  }
  .label,
  .value {
    position: absolute;
    font-size: 0.875em;
    bottom: calc(50% + var(--size) / 2 + 0.5em);
    color: ${theme.describeColor};
  }
  .value {
    right: 0;
  }
  .input {
    width: 50px;
  }
`);

/**
 * @customElement dy-slider
 */
@customElement('dy-slider')
@adoptedStyle(style)
@adoptedStyle(focusStyle)
export class DuoyunSliderElement extends GemElement {
  @attribute label: string;
  @attribute orientation: 'horizontal' | 'vertical';
  @boolattribute editable: boolean;
  @boolattribute disabled: boolean;
  @refobject sliderRef: RefObject<HTMLDivElement>;

  @numattribute value: number;
  @numattribute min: number;
  @numattribute max: number;
  @numattribute step: number;

  @globalemitter change: Emitter<number>;

  get #orientation() {
    return this.orientation || 'horizontal';
  }

  get #max() {
    return this.hasAttribute('max') ? this.max : 100;
  }

  get #step() {
    return this.step || 1;
  }

  get #diff() {
    return this.#max - this.min;
  }

  constructor() {
    super();
    this.tabIndex = 0;
    this.addEventListener('keydown', this.#onKeydown);
    this.internals.role = 'slider';
    this.effect(
      () => {
        this.internals.ariaDisabled = String(this.disabled);
        this.internals.ariaValueText = String(this.value);
        this.#setPrecisionValue(this.value);
      },
      () => [this.value, this.disabled],
    );
  }

  state = {
    position: 0,
    displayPosition: 0,
    start: false,
  };

  #getValue = (precisionValue: number) => {
    const remainder = precisionValue % this.#step;
    const rest = Math.round(remainder / this.#step) * this.#step;
    return precisionValue - remainder + rest;
  };

  #onPan = ({ detail, target }: CustomEvent<PanEventDetail>) => {
    if (this.disabled) return;
    const { width, height } = this.sliderRef.element!.getBoundingClientRect();
    const { left, right, top, bottom, width: w, height: h } = (target as Element).getBoundingClientRect();
    const isV = this.#orientation === 'vertical';
    const totalLength = isV ? height - h : width - w;
    const center = (isV ? top + bottom : left + right) / 2;
    const current = isV ? detail.clientY : detail.clientX;
    const movement = isV ? detail.y : detail.x;

    if (movement < 0 && current > center) return;
    if (movement > 0 && current < center) return;
    const position = clamp(0, this.state.position + movement / totalLength, 1);
    const precisionValue = position * this.#diff;
    const value = this.#getValue(precisionValue);
    this.setState({ position });
    this.change(value);
  };

  #setPrecisionValue = (precisionValue: number) => {
    const value = this.#getValue(clamp(this.min, precisionValue, this.#max));
    const position = value / this.#diff;
    this.setState({ position, displayPosition: position });
    this.change(value);
  };

  #onKeydown = hotkeys({
    up: () => this.#setPrecisionValue(this.value + 1),
    down: () => this.#setPrecisionValue(this.value - 1),
  });

  render = () => {
    const { displayPosition, start } = this.state;
    const position = `calc(var(--size) / 2 + calc(100% - var(--size)) * ${displayPosition})`;
    return html`
      <style>
        .slider {
          background: radial-gradient(
            circle at ${position},
            transparent,
            transparent var(--c),
            ${theme.borderColor} var(--c)
          );
        }
        .mark {
          left: ${position};
        }
      </style>
      <div class="slider" ref=${this.sliderRef.ref}>
        <dy-gesture
          class=${classMap({ mark: true, start })}
          @pan=${this.#onPan}
          @pointerdown=${() => !this.disabled && this.setState({ start: true })}
          @end=${() => this.setState({ start: false })}
        ></dy-gesture>
        ${this.label
          ? html`
              <div class="label">${this.label}</div>
              <div class="value">${this.value}</div>
            `
          : ''}
      </div>
      ${this.editable
        ? html`
            <dy-input
              ?disabled=${this.disabled}
              class="input"
              type="number"
              value=${String(this.value)}
              @change=${({ detail }: CustomEvent<number>) => this.#setPrecisionValue(detail)}
            ></dy-input>
          `
        : ''}
    `;
  };
}
