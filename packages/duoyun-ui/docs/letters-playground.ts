import type { GemBookElement } from '../../gem-book';
import type { DuoyunLettersElement } from '../elements/letters';

await customElements.whenDefined('gem-book');

const { GemBookPluginElement } = customElements.get('gem-book') as typeof GemBookElement;
const { Gem, theme, icons } = GemBookPluginElement;
const { html, adoptedStyle, css, customElement, createRef, createState, raw } = Gem;

const play = raw`
  <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M320-200v-560l440 280-440 280Zm80-280Zm0 134 210-134-210-134v268Z"/></svg>
`;
const pause = raw`
  <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M520-200v-560h240v560H520Zm-320 0v-560h240v560H200Zm400-80h80v-400h-80v400Zm-320 0h80v-400h-80v400Zm0-400v400-400Zm320 0v400-400Z"/></svg>
`;

enum Bg {
  Gradient = 'gradient',
  Photo = 'photo',
}

const bgOptions = [
  { label: 'Photo', value: Bg.Photo },
  { label: 'Gradient', value: Bg.Gradient },
];
const easingOptions = [
  { label: 'Linear', value: 'linear' },
  { label: 'Ease In Out', value: 'ease-in-out' },
  { label: 'Ease In', value: 'ease-in' },
  { label: 'Ease Out', value: 'ease-out' },
  { label: 'Ease In Back', value: 'ease-in-back' },
  { label: 'Ease Out Back', value: 'ease-out-back' },
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

  @container (width < 600px) {
    .wrap {
      flex-direction: column;
    }
  }

  .preview {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 17em;
    min-height: 10em;
    flex-shrink: 0;
    border: 1px solid ${theme.borderColor};
    border-radius: ${theme.normalRound};
    display: flex;
    flex-direction: column;
    overflow: hidden;

    &.photo {
      background-image: url('https://www.kumailnanji.com/images/macos-wallpaper.jpeg');
      background-size: cover;
    }

    &.gradient {
      background: color-mix(in srgb, ${theme.textColor} 5%, transparent);
    }

    .play-bar {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      box-sizing: border-box;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: .5em;

      dy-slider {
        flex: 1;
      }
    }
  }

  @container (width < 600px) {
    .preview {
      width: 100%;
    }
  }

  .controls {
    display: grid;
    gap: 0.8rem;
    align-content: start;
  }

  .row {
    display: flex;
    gap: 0.5rem;
    align-items: center;

    label {
      width: 6.5rem;
      color: ${theme.textColor};
      font-size: 0.85rem;
      flex-shrink: 0;
    }

    dy-input, dy-select, dy-solider, dy-segmented {
      width: 15em;
    }

    .val {
      color: color-mix(in srgb, ${theme.textColor} 60%, transparent);
      font-size: 0.8rem;
      min-width: 2.8rem;
      text-align: right;
    }
  }

  @container (width < 600px) {
    .row {
      flex-wrap: wrap;

      label {
        width: 100%;
      }

      dy-input, dy-select, dy-solider, dy-segmented {
        flex: 1;
        min-width: 0;
      }
    }
  }

  .colors {
    display: flex;
    gap: 0.5em;
    align-items: center;
    flex-wrap: wrap;

    .color-item {
      display: flex;
      position: relative;
      * {
        font-size: 0.75em;
      }
      dy-color-picker {
        aspect-ratio: 1;
        width: auto;
      }
      .remove-color-btn {
        position: absolute;
        top: 0px;
        right: 0px;
        transform: translate(50%, -50%) scale(0.6) rotate(45deg);
      }

      @media (pointer: fine) {
        &:not(:hover) {
          .remove-color-btn {
            display: none;
          }
        }
      }
    }
  }
`;

const DEFAULT_GRADIENT_COLORS = ['#007AFF', '#AF52DE', '#FF3B30', '#FF9500', '#FFCC00', '#34C759'];

enum PlayingState {
  Before,
  Playing,
  Pause,
}

@customElement('letters-playground')
@adoptedStyle(style)
class _LettersPlaygroundElement extends GemBookPluginElement {
  #dy = createRef<DuoyunLettersElement>();
  #state = createState({
    bg: Bg.Gradient,
    playing: PlayingState.Before,
    progress: 0,
    props: {
      text: 'hello',
      colors: DEFAULT_GRADIENT_COLORS.join(),
      strokeWidth: 2,
      duration: 1500,
      easing: 'ease-in-out',
      autoplay: true,
    },
  });

  #setProps = (props: any) => {
    this.#state({ props: { ...this.#state.props, ...props } });
  };

  #onText = (e: CustomEvent<string>) => {
    const text = e.detail;
    this.#setProps({ text });
  };

  #onStroke = (e: CustomEvent<number>) => {
    const strokeWidth = e.detail;
    this.#setProps({ strokeWidth });
  };

  #onDuration = (e: CustomEvent<number>) => {
    const duration = e.detail;
    this.#setProps({ duration });
  };

  #onEasing = (e: CustomEvent<string>) => {
    const easing = e.detail;
    this.#setProps({ easing });
  };

  #onColors = (index: number, e: CustomEvent<string>) => {
    const newColor = e.detail;
    const colors = this.#state.props.colors.split(',');
    colors[index] = newColor;
    this.#setProps({ colors: colors.join(',') });
  };

  #addColor = () => {
    const colors = this.#state.props.colors.split(',');
    colors.push('#000000');
    this.#setProps({ colors: colors.join(',') });
  };

  #removeColor = (index: number) => {
    const colorList = this.#state.props.colors.split(',');
    if (colorList.length <= 1) return;
    const colors = colorList.filter((_: string, i: number) => i !== index);
    this.#setProps({ colors: colors.join(',') });
  };

  #onChangeBg = (e: CustomEvent<Bg>) => {
    const colors = e.detail === Bg.Photo ? 'white' : DEFAULT_GRADIENT_COLORS.join();
    this.#setProps({ colors });
    this.#state({ bg: e.detail });
  };

  #togglePlay = () => {
    const dy = this.#dy.value;
    if (!dy) return;

    switch (this.#state.playing) {
      case PlayingState.Before: {
        dy.play?.();
        this.#state({ playing: PlayingState.Playing });
        break;
      }
      case PlayingState.Playing: {
        dy.pause?.();
        this.#state({ playing: PlayingState.Pause });
        break;
      }
      case PlayingState.Pause: {
        dy.resume?.();
        this.#state({ playing: PlayingState.Playing });
      }
    }
  };

  #onFinished = () => {
    this.#state({ playing: PlayingState.Before });
  };

  #onProgress = (e: CustomEvent<number>) => {
    this.#state({ progress: e.detail });
  };

  #onSetPosition = (e: CustomEvent<number>) => {
    this.#dy.value?.position(e.detail);
    this.#state({
      progress: e.detail,
      playing: e.detail === 1 ? PlayingState.Before : PlayingState.Pause,
    });
  };

  render = () => {
    const { bg, playing, progress, props } = this.#state;
    const colors = props.colors.split(',');

    return html`
      <div class="wrap">
        <div class="preview ${bg}">
          <dy-letters ${this.#dy} ${props} @finished=${this.#onFinished} @elapse=${this.#onProgress}></dy-letters>
          <div class="play-bar">
            <dy-button .icon=${playing === PlayingState.Playing ? pause : play} round square @click=${this.#togglePlay}></dy-button>
            <dy-slider min="0" max="1" step="0.001" value=${progress} @change=${this.#onSetPosition}></dy-slider>
          </div>
        </div>

        <div class="controls">
          <div class="row">
            <label>Text</label>
            <dy-input type="text" value=${props.text} @change=${this.#onText}    ></dy-input>
          </div>

          <div class="row">
            <label>Easing</label>
            <dy-select @change=${this.#onEasing} .value=${props.easing} .options=${easingOptions}></dy-select>
          </div>

          <div class="row">
            <label>Background</label>
            <dy-segmented .value=${bg} @change=${this.#onChangeBg} .options=${bgOptions}></dy-segmented>
          </div>

          <div v-if=${bg === Bg.Gradient} class="row">
            <label>Colors</label>
            <div class="colors">
              ${colors.map(
                (color: string, index: number) => html`
                  <div class="color-item">
                    <dy-color-picker value=${color} @change=${(e: CustomEvent) => this.#onColors(index, e)}></dy-color-picker>
                    <dy-button class="remove-color-btn" color="cancel" .icon=${icons.add} round square v-if=${colors.length > 1} @click=${() => this.#removeColor(index)}></dy-button>
                  </div>
                `,
              )}
              <div class="color-item" v-if=${colors.length < 6}>
                <dy-button color="cancel" .icon=${icons.add} square @click=${this.#addColor}></dy-button>
              </div>
            </div>
          </div>

          <div class="row">
            <label>Stroke width</label>
            <dy-slider min="0.5" max="8" step="0.1" value=${props.strokeWidth} @change=${this.#onStroke}></dy-slider>
            <span class="val">${props.strokeWidth.toFixed(1)}</span>
          </div>

          <div class="row">
            <label>Duration</label>
            <dy-slider min="200" max="5000" step="100" value=${props.duration} @change=${this.#onDuration}></dy-slider>
            <span class="val">${(props.duration / 1000).toFixed(2)}s</span>
          </div>
        </div>
      </div>
    `;
  };
}
