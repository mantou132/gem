import type { GemBookElement } from '../../gem-book';

await customElements.whenDefined('gem-book');

const { GemBookPluginElement } = customElements.get('gem-book') as typeof GemBookElement;
const { Gem, theme } = GemBookPluginElement;
const { html, adoptedStyle, css, customElement, createState } = Gem;

type State = {
  value: number;
  duration: number;
  maxblur: number;
  easing: string;
  align: 'left' | 'right';
};

const easingOptions = [
  { label: 'Linear', value: 'linear' },
  { label: 'Ease In Out', value: 'ease-in-out-cubic' },
  { label: 'Ease Out', value: 'ease-out-cubic' },
  { label: 'Ease In', value: 'ease-in-cubic' },
  { label: 'Ease Out Back', value: 'ease-out-back' },
  { label: 'Ease Out Expo', value: 'ease-out-expo' },
];

const alignOptions = [
  { label: 'Left', value: 'left' },
  { label: 'Right', value: 'right' },
];

const style = css`
  :scope:where(:not([hidden])) {
    display: block;
    container-type: inline-size;
  }

  .wrap {
    display: flex;
    gap: 1rem;
    align-items: stretch;
  }

  @container (width < 680px) {
    .wrap {
      flex-direction: column;
    }
  }

  .preview {
    position: relative;
    width: min(24em, 42%);
    min-width: 18em;
    min-height: 17em;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border: 1px solid ${theme.borderColor};
    border-radius: ${theme.normalRound};
    background:
      linear-gradient(
        color-mix(in srgb, ${theme.backgroundColor} 78%, transparent),
        color-mix(in srgb, ${theme.backgroundColor} 78%, transparent)
      ),
      repeating-linear-gradient(90deg, transparent 0 1.45em, color-mix(in srgb, ${theme.textColor} 10%, transparent) 1.45em 1.5em),
      repeating-linear-gradient(0deg, transparent 0 1.45em, color-mix(in srgb, ${theme.primaryColor} 12%, transparent) 1.45em 1.5em),
      color-mix(in srgb, ${theme.primaryColor} 9%, ${theme.backgroundColor});
  }

  @container (width < 680px) {
    .preview {
      width: 100%;
      min-width: 0;
    }
  }

  .readout {
    position: relative;
    box-sizing: border-box;
    width: min(86%, 20em);
    min-height: 8em;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.3rem;
    overflow: hidden;
    border: 1px solid color-mix(in srgb, ${theme.textColor} 16%, ${theme.borderColor});
    border-radius: ${theme.normalRound};
    background:
      linear-gradient(90deg, transparent, color-mix(in srgb, white 18%, transparent), transparent),
      color-mix(in srgb, ${theme.backgroundColor} 92%, ${theme.primaryColor});
    box-shadow:
      inset 0 1px 0 color-mix(in srgb, white 60%, transparent),
      inset 0 -1.5em 3em color-mix(in srgb, ${theme.textColor} 6%, transparent),
      0 0.9em 2.4em color-mix(in srgb, ${theme.textColor} 12%, transparent);
  }

  .readout::before,
  .readout::after {
    content: "";
    position: absolute;
    inset-block: 0;
    width: 14%;
    pointer-events: none;
  }

  .readout::before {
    inset-inline-start: 0;
    background: linear-gradient(90deg, color-mix(in srgb, ${theme.backgroundColor} 95%, transparent), transparent);
  }

  .readout::after {
    inset-inline-end: 0;
    background: linear-gradient(270deg, color-mix(in srgb, ${theme.backgroundColor} 95%, transparent), transparent);
  }

  .number {
    position: relative;
    z-index: 1;
    display: flex;
    justify-content: center;
    width: 100%;
    color: color-mix(in srgb, ${theme.textColor} 86%, ${theme.primaryColor});
    font-size: 56px;
    font-weight: 700;
    letter-spacing: 0;
    line-height: 1;
  }

  dy-rolling-number {
    max-width: 100%;
  }

  .controls {
    flex: 1;
    min-width: 0;
    display: grid;
    gap: 0.8rem;
    align-content: start;
  }

  .row {
    display: grid;
    grid-template-columns: 6.5rem minmax(0, 1fr) 4.4rem;
    gap: 0.65rem;
    align-items: center;
  }

  .row label {
    color: ${theme.textColor};
    font-size: 0.85rem;
  }

  .row dy-input,
  .row dy-select,
  .row dy-slider,
  .row dy-segmented {
    width: 100%;
  }

  .val {
    min-width: 0;
    color: color-mix(in srgb, ${theme.textColor} 60%, transparent);
    font-size: 0.8rem;
    text-align: right;
    white-space: nowrap;
  }

  @container (width < 520px) {
    .row {
      grid-template-columns: 1fr;
      gap: 0.35rem;
    }

    .val {
      text-align: left;
    }
  }
`;

@customElement('rolling-number-playground')
@adoptedStyle(style)
class _RollingNumberPlaygroundElement extends GemBookPluginElement {
  #state = createState<State>({
    value: 1234,
    duration: 800,
    maxblur: 2,
    easing: 'ease-in-out-cubic',
    align: 'left',
  });

  #setState = (state: Partial<State>) => {
    this.#state(state);
  };

  #onValue = (evt: CustomEvent<number | string>) => {
    const value = Number(evt.detail);
    if (Number.isNaN(value)) return;
    this.#setState({ value });
  };

  #onDuration = (evt: CustomEvent<number>) => {
    this.#setState({ duration: evt.detail });
  };

  #onMaxBlur = (evt: CustomEvent<number>) => {
    this.#setState({ maxblur: evt.detail });
  };

  #onEasing = (evt: CustomEvent<string>) => {
    this.#setState({ easing: evt.detail });
  };

  #onAlign = (evt: CustomEvent<'left' | 'right'>) => {
    this.#setState({ align: evt.detail });
  };

  render = () => {
    const state = this.#state;

    return html`
      <div class="wrap">
        <div class="preview">
          <div class="readout">
            <div class="number">
              <dy-rolling-number
                value=${state.value}
                duration=${state.duration}
                maxblur=${state.maxblur}
                easing=${state.easing}
                align=${state.align}
              ></dy-rolling-number>
            </div>
          </div>
        </div>

        <div class="controls">
          <div class="row">
            <label>Value</label>
            <dy-slider min="0" max="9999" step="1" value=${state.value} @change=${this.#onValue}></dy-slider>
            <dy-input type="number" value=${state.value} @change=${this.#onValue}></dy-input>
          </div>

          <div class="row">
            <label>Duration</label>
            <dy-slider min="100" max="3000" step="50" value=${state.duration} @change=${this.#onDuration}></dy-slider>
            <span class="val">${(state.duration / 1000).toFixed(2)}s</span>
          </div>

          <div class="row">
            <label>Easing</label>
            <dy-select @change=${this.#onEasing} .value=${state.easing} .options=${easingOptions}></dy-select>
            <span></span>
          </div>

          <div class="row">
            <label>Align</label>
            <dy-segmented .value=${state.align} @change=${this.#onAlign} .options=${alignOptions}></dy-segmented>
            <span></span>
          </div>

          <div class="row">
            <label>Max blur</label>
            <dy-slider min="0" max="8" step="0.1" value=${state.maxblur} @change=${this.#onMaxBlur}></dy-slider>
            <span class="val">${state.maxblur.toFixed(1)}px</span>
          </div>
        </div>
      </div>
    `;
  };
}
