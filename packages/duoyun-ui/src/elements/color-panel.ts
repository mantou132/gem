// https://spectrum.adobe.com/page/color-area/
import {
  adoptedStyle,
  customElement,
  attribute,
  globalemitter,
  Emitter,
  boolattribute,
} from '@mantou/gem/lib/decorators';
import { GemElement, html } from '@mantou/gem/lib/element';
import { createCSSSheet, css, styleMap, classMap } from '@mantou/gem/lib/utils';

import {
  HexColor,
  parseHexColor,
  rgbToHexColor,
  rgbToHslColor,
  rgbToRgbColor,
  hslToRgb,
  rgbToHsl,
  hslToHsv,
  hsvToHsl,
  isValidHexColor,
} from '../lib/color';
import { theme } from '../lib/theme';
import { icons } from '../lib/icons';
import { clamp, formatToPrecision } from '../lib/number';

import type { PanEventDetail } from './gesture';

import './gesture';
import './use';
import './input';
import './select';

const style = createCSSSheet(css`
  :host {
    display: flex;
    flex-direction: column;
    gap: 1em;
    width: 20em;
    font-size: 0.875em;
    --hsl: hsl(var(--h), var(--s), var(--l));
    --hue: hsl(var(--h), 100%, 50%);
    --alpha: linear-gradient(var(--hue), transparent),
      conic-gradient(transparent 0.25turn, #d3cfcf 0.25turn 0.5turn, transparent 0.5turn 0.75turn, #d3cfcf 0.75turn) top
        left / 1.2em 1.2em repeat;
  }
  .color {
    display: flex;
    align-items: stretch;
    gap: 1em;
  }
  .area {
    flex-grow: 1;
    aspect-ratio: 1 / 1;
    background-color: var(--hue);
    background-image: linear-gradient(transparent, #000), linear-gradient(90deg, #fff, transparent);
  }
  .hue-bar,
  .alpha-bar {
    width: 1.8em;
  }
  .hue-bar {
    background-image: linear-gradient(
      ${Array.from({ length: 15 }, (_, i) => `hsl(${360 - (360 / (15 - 1)) * i}, 100%, 50%)`).join(',')}
    );
  }
  .alpha-bar {
    background: var(--alpha);
  }
  .area,
  .hue-bar,
  .alpha-bar {
    position: relative;
    border-radius: ${theme.normalRound};
    box-shadow: inset 0 0 0 1px #0002;
  }
  .current {
    transition: transform 0.1s;
    background: radial-gradient(transparent 50%, white 50%);
  }
  .current.grabbing {
    transform: translate(-50%, -50%) scale(1.3);
  }
  .current,
  .current span {
    position: absolute;
    width: 1.2em;
    aspect-ratio: 1;
    border-radius: 10em;
    border: 1px solid #0008;
    transform: translate(-50%, -50%);
  }
  .current span {
    left: 50%;
    top: 50%;
    width: 66%;
    background-clip: content-box;
  }
  .area .current span {
    background-color: var(--hsl);
  }
  .hue-bar .current span {
    background-color: var(--hue);
  }
  .alpha-bar .current span {
    background-color: transparent;
  }
  .input {
    display: flex;
    align-items: center;
    gap: 0.5em;
  }
  .type {
    width: 5em;
    flex-shrink: 0;
  }
  .value,
  .alpha {
    border-radius: 0;
    border-top-color: transparent;
    border-inline: none;
  }
  :where(.value, .alpha)::part(input) {
    padding-inline: 0;
  }
  .value {
    width: auto;
    flex-shrink: 1;
  }
  .alpha {
    width: 3em;
    margin-inline-end: 2em;
  }
  .hidden {
    pointer-events: none;
    opacity: 0;
  }
  .colorize {
    padding: 0.15em;
    width: 1.5em;
    flex-shrink: 0;
    border-radius: ${theme.normalRound};
  }
  .colorize:hover {
    background: ${theme.lightBackgroundColor};
  }
`);

type Mode = 'Hex' | 'RGB' | 'HSL';

type State = {
  mode: Mode;
  grabbingHue: boolean;
  grabbingSV: boolean;
  grabbingA: boolean;
};

/**
 * @customElement dy-color-panel
 * @attr value
 * @attr alpha
 */
@customElement('dy-color-panel')
@adoptedStyle(style)
export class DuoyunColorPanelElement extends GemElement<State> {
  @attribute value: HexColor;
  @boolattribute alpha: boolean;

  @globalemitter change: Emitter<HexColor>;

  constructor() {
    super();
    this.internals.role = 'widget';
  }

  state: State = {
    mode: 'Hex',
    grabbingHue: false,
    grabbingA: false,
    grabbingSV: false,
  };

  // stringify
  #r = 0;
  #g = 0;
  #b = 0;

  #h = 0;
  #s = 0;
  #l = 0;
  #a = 0;
  // hsv
  #sa = 0;
  #v = 0;

  // without alpha
  #value = '';

  #typeOptions: { label: Mode }[] = [
    {
      label: 'Hex',
    },
    {
      label: 'RGB',
    },
    {
      label: 'HSL',
    },
  ];

  #getColor = (mode: Mode) => {
    switch (mode) {
      case 'Hex':
        return rgbToHexColor([this.#r, this.#g, this.#b]);
      case 'RGB':
        return rgbToRgbColor([this.#r, this.#g, this.#b]);
      case 'HSL':
        return rgbToHslColor([this.#r, this.#g, this.#b]);
    }
  };

  #getPosition = (target: HTMLElement, { clientX, clientY }: PanEventDetail) => {
    const { left, top, width, height } = target.getBoundingClientRect();
    return {
      left: clamp(0, clientX - left, width) / width,
      top: clamp(0, clientY - top, height) / height,
    };
  };

  #setRgb = () => {
    const [r, g, b] = hslToRgb([this.#h, this.#s, this.#l]);
    this.#r = r;
    this.#g = g;
    this.#b = b;
    this.#value = this.#getColor('Hex');
  };

  #onPanHue = ({ detail, target }: CustomEvent<PanEventDetail>) => {
    const { top } = this.#getPosition(target as HTMLElement, detail);
    this.#h = 1 - top;
    this.#setRgb();
    this.setState({ grabbingHue: true });
  };

  #onPanSV = ({ detail, target }: CustomEvent<PanEventDetail>) => {
    const { left, top } = this.#getPosition(target as HTMLElement, detail);
    this.#v = 1 - top;
    this.#sa = left;
    const [_, s, l] = hsvToHsl([this.#h, this.#sa, this.#v]);
    this.#s = s;
    this.#l = l;
    this.#setRgb();
    this.setState({ grabbingSV: true });
  };

  #onPanA = ({ detail, target }: CustomEvent<PanEventDetail>) => {
    const { top } = this.#getPosition(target as HTMLElement, detail);
    this.#a = 1 - top;
    this.setState({ grabbingA: true });
  };

  #onChangeType = (evt: CustomEvent<Mode>) => {
    evt.stopPropagation();
    this.setState({ mode: evt.detail });
  };

  #onChangeValue = (evt: CustomEvent<string>) => {
    evt.stopPropagation();
    if (this.state.mode !== 'Hex') {
      this.setState({ mode: 'Hex' });
    } else {
      this.#value = '#' + evt.detail.trim().replace('#', '').replace(/[g-z]/gi, '').toLowerCase();
      // valid color emit event
      if (isValidHexColor(this.#value)) {
        this.#init(this.#value);
        this.#onChange();
      } else {
        this.update();
      }
    }
  };

  #onChangeA = (evt: CustomEvent<string>) => {
    evt.stopPropagation();
    this.#a = clamp(0, Number(evt.detail) || 0, 1);
    this.#onChange();
  };

  #onChange = () => {
    const isShort = this.#value.length === 4;
    const aStr = Math.round(this.#a * 255)
      .toString(16)
      .padStart(2, '0');
    const supportSingle = aStr[0] === aStr[1];
    const useShort = isShort && supportSingle;
    if (!useShort) {
      this.#value = this.#getColor('Hex');
    }
    const color = (this.alpha && this.#a !== 1 ? this.#value + (useShort ? aStr[0] : aStr) : this.#value) as HexColor;
    this.setState({ grabbingHue: false, grabbingSV: false, grabbingA: false });
    this.change(color);
  };

  #openEyeDropper = async () => {
    const result = await new (window as any).EyeDropper().open();
    this.change(result.sRGBHex);
  };

  #init = (value: HexColor) => {
    const [r, g, b, a] = parseHexColor(value);
    const [h, s, l] = rgbToHsl([r, g, b]);
    const [_, sa, v] = hslToHsv([h, s, l]);
    this.#r = r;
    this.#g = g;
    this.#b = b;
    this.#a = a;
    if (v !== 0 && sa !== 0) {
      this.#h = h;
    }
    this.#s = s;
    this.#l = l;
    if (v !== 0) {
      this.#sa = sa;
    }
    this.#v = v;
    this.#value = value.length === 5 ? value.slice(0, 4) : value.length === 9 ? value.slice(0, 7) : value;
  };

  willMount = () => {
    this.memo(
      () => this.#init(this.value || '#fff'),
      () => [this.value],
    );
  };

  render = () => {
    const { mode, grabbingHue, grabbingSV, grabbingA } = this.state;
    return html`
      <style>
        :host {
          --h: ${this.#h * 360};
          --s: ${this.#s * 100}%;
          --l: ${this.#l * 100}%;
          --a: ${this.#a};
        }
      </style>
      <div class="color">
        <dy-gesture class="area" @pan=${this.#onPanSV} @end=${this.#onChange}>
          <div
            class=${classMap({ current: true, grabbing: grabbingSV })}
            style=${styleMap({ left: `${this.#sa * 100}%`, top: `${(1 - this.#v) * 100}%` })}
          >
            <span></span>
          </div>
        </dy-gesture>
        <dy-gesture class="hue-bar" @pan=${this.#onPanHue} @end=${this.#onChange}>
          <div
            class=${classMap({ current: true, grabbing: grabbingHue })}
            style=${styleMap({ top: `${(1 - this.#h) * 100}%`, left: '50%' })}
          >
            <span></span>
          </div>
        </dy-gesture>
        ${this.alpha
          ? html`
              <dy-gesture class="alpha-bar" @pan=${this.#onPanA} @end=${this.#onChange}>
                <div
                  class=${classMap({ current: true, grabbing: grabbingA })}
                  style=${styleMap({ top: `${(1 - this.#a) * 100}%`, left: '50%' })}
                >
                  <span></span>
                </div>
              </dy-gesture>
            `
          : ''}
      </div>
      <div class="input">
        <dy-select
          class="type"
          ?borderless=${true}
          .options=${this.#typeOptions}
          .value=${mode}
          .dropdownStyle=${{ fontSize: '0.75em' }}
          @change=${this.#onChangeType}
        ></dy-select>
        <dy-input
          class="value"
          value=${mode === 'Hex' ? this.#value : this.#getColor(mode)}
          @change=${this.#onChangeValue}
        ></dy-input>
        <dy-input
          class=${classMap({ alpha: true, hidden: !this.alpha })}
          aria-hidden=${!this.alpha}
          type="number"
          value=${String(formatToPrecision(this.#a))}
          step=${0.1}
          @change=${this.#onChangeA}
        ></dy-input>
        <dy-use
          role="button"
          aria-hidden=${!('EyeDropper' in window)}
          class=${classMap({ colorize: true, hidden: !('EyeDropper' in window) })}
          .element=${icons.colorize}
          @click=${this.#openEyeDropper}
        ></dy-use>
      </div>
    `;
  };
}
