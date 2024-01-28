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
  :host(:where(:not([hidden]))) {
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
    position: absolute;
    width: 1.2em;
    /* webkit bug: aspect-ratio */
    height: 1.2em;
    border-radius: 10em;
    color: #0008;
    border: 1px solid;
    transform: translate(-50%, -50%);
    transition: font-size 0.1s;
  }
  .current.grabbing {
    font-size: 1.2em;
  }
  .current::after {
    content: '';
    position: absolute;
    inset: 0px;
    border-radius: inherit;
    border: 2px solid white;
    box-shadow: inset 0 0 0 1px;
  }
  .area .current {
    background-color: var(--hsl);
  }
  .hue-bar .current {
    background-color: var(--hue);
  }
  .alpha-bar .current {
    background-color: transparent;
  }
  .input {
    display: flex;
    align-items: center;
    gap: 0.5em;
    font-feature-settings: 'tnum';
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
    box-shadow: none;
  }
  :where(.value, .alpha)::part(input) {
    padding-inline: 0;
  }
  .value {
    width: auto;
    flex-shrink: 1;
  }
  .alpha {
    width: 3.2em;
    margin-inline-end: 1.8em;
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
  // stringify
  r: number;
  g: number;
  b: number;

  h: number;
  s: number;
  l: number;
  a: number;
  // hsv
  sa: number;
  v: number;

  // current input value; without alpha
  str: string;

  commitValue?: { v?: number; sa?: number; h?: number; a?: number; str?: string };
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

  get #color() {
    const { r, g, b, mode } = this.state;
    switch (mode) {
      case 'Hex':
        return rgbToHexColor([r, g, b]);
      case 'RGB':
        return rgbToRgbColor([r, g, b]);
      case 'HSL':
        return rgbToHslColor([r, g, b]);
    }
  }

  constructor() {
    super();
    this.internals.role = 'widget';
  }

  state: State = {
    mode: 'Hex',
    grabbingHue: false,
    grabbingA: false,
    grabbingSV: false,
    // stringify
    r: 0,
    g: 0,
    b: 0,

    h: 0,
    s: 0,
    l: 0,
    a: 0,
    // hsv
    sa: 0,
    v: 0,

    // without alpha
    str: '',
  };

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

  #getPosition = (target: HTMLElement, { clientX, clientY }: PanEventDetail) => {
    const { left, top, width, height } = target.getBoundingClientRect();
    return {
      left: clamp(0, clientX - left, width) / width,
      top: clamp(0, clientY - top, height) / height,
    };
  };

  #onPanHue = ({ detail, target }: CustomEvent<PanEventDetail>) => {
    this.setState({ grabbingHue: true });
    const { a, s, l } = this.state;
    const { top } = this.#getPosition(target as HTMLElement, detail);
    const h = 1 - top;
    const [r, g, b] = hslToRgb([h, s, l]);
    const color = rgbToHexColor([r, g, b, a]);
    this.setState({ commitValue: { h, str: color } });
    this.change(color);
    if (color === this.value) {
      this.setState({ h });
    }
  };

  #onPanSV = ({ detail, target }: CustomEvent<PanEventDetail>) => {
    this.setState({ grabbingSV: true });
    const { h, a, str } = this.state;
    const { left, top } = this.#getPosition(target as HTMLElement, detail);
    const v = 1 - top;
    const sa = left;
    const [_, s, l] = hsvToHsl([h, sa, v]);
    const [r, g, b] = hslToRgb([h, s, l]);
    const color = rgbToHexColor([r, g, b, a]);
    this.setState({
      sa: color === str ? sa : this.state.sa,
      commitValue: { str: color, v, sa, h },
    });
    this.change(color);
  };

  #onPanA = ({ detail, target }: CustomEvent<PanEventDetail>) => {
    this.setState({ grabbingA: true });
    const { h, s, l, sa } = this.state;
    const [r, g, b] = hslToRgb([h, s, l]);
    const { top } = this.#getPosition(target as HTMLElement, detail);
    const a = 1 - top;
    const color = rgbToHexColor([r, g, b, a]);
    this.setState({ commitValue: { str: color, h, a, sa } });
    this.change(color);
  };

  #onPanEnd = () => {
    this.setState({ grabbingHue: false, grabbingSV: false, grabbingA: false });
  };

  #onChangeType = (evt: CustomEvent<Mode>) => {
    evt.stopPropagation();
    this.setState({ mode: evt.detail });
  };

  #onChangeValue = (evt: CustomEvent<string>) => {
    evt.stopPropagation();
    const { mode, a } = this.state;
    if (mode !== 'Hex') {
      this.setState({ mode: 'Hex' });
      return;
    }
    let str = '#' + evt.detail.trim().replace('#', '').replace(/[g-z]/gi, '').toLowerCase();
    // valid color emit event
    if (isValidHexColor(str)) {
      const aStr = Math.round(a * 255)
        .toString(16)
        .padStart(2, '0');
      const isShortHex = str.length === 4 && aStr[0] === aStr[1];
      str = str.slice(0, isShortHex ? 4 : 7);
      this.change((this.alpha && a !== 1 ? str + (isShortHex ? aStr[0] : aStr) : str) as HexColor);
    }
    this.setState({ str });
  };

  #onChangeA = (evt: CustomEvent<string>) => {
    evt.stopPropagation();
    const { r, g, b } = this.state;
    this.change(rgbToHexColor([r, g, b, clamp(0, Number(evt.detail) || 0, 1)]));
  };

  #openEyeDropper = async () => {
    const result = await new (window as any).EyeDropper().open();
    this.change(result.sRGBHex);
  };

  willMount = () => {
    this.memo(
      () => {
        const value = this.value || '#fff';
        const [r, g, b, a] = parseHexColor(value);
        const [h, s, l] = rgbToHsl([r, g, b]);
        const [_, sa, v] = hslToHsv([h, s, l]);
        const str = value.length === 5 ? value.slice(0, 4) : value.length === 9 ? value.slice(0, 7) : value;
        const parseState: Partial<State> = { r, g, b, a, h, s, l, sa, v, str };
        if (this.value === this.state.commitValue?.str) {
          this.setState({ ...parseState, ...this.state.commitValue });
          return;
        } else {
          this.setState({ ...parseState });
        }
      },
      () => [this.value],
    );
  };

  render = () => {
    const { mode, grabbingHue, grabbingSV, grabbingA, h, s, l, a, sa, v, str } = this.state;
    return html`
      <style>
        :host {
          --h: ${h * 360};
          --s: ${s * 100}%;
          --l: ${l * 100}%;
          --a: ${a};
        }
      </style>
      <div class="color">
        <dy-gesture class="area" @pan=${this.#onPanSV} @end=${this.#onPanEnd}>
          <div
            class=${classMap({ current: true, grabbing: grabbingSV })}
            style=${styleMap({ left: `${sa * 100}%`, top: `${(1 - v) * 100}%` })}
          ></div>
        </dy-gesture>
        <dy-gesture class="hue-bar" @pan=${this.#onPanHue} @end=${this.#onPanEnd}>
          <div
            class=${classMap({ current: true, grabbing: grabbingHue })}
            style=${styleMap({ top: `${(1 - h) * 100}%`, left: '50%' })}
          ></div>
        </dy-gesture>
        ${this.alpha
          ? html`
              <dy-gesture class="alpha-bar" @pan=${this.#onPanA} @end=${this.#onPanEnd}>
                <div
                  class=${classMap({ current: true, grabbing: grabbingA })}
                  style=${styleMap({ top: `${(1 - a) * 100}%`, left: '50%' })}
                ></div>
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
        <dy-input class="value" value=${mode === 'Hex' ? str : this.#color} @change=${this.#onChangeValue}></dy-input>
        <dy-input
          class=${classMap({ alpha: true, hidden: !this.alpha })}
          aria-hidden=${!this.alpha}
          type="number"
          value=${String(formatToPrecision(a))}
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
