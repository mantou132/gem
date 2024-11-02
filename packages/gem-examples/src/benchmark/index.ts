/// <reference types="vite/client" />
import {
  html,
  customElement,
  GemElement,
  render,
  attribute,
  numattribute,
  css,
  adoptedStyle,
  createRef,
  repeat,
  shadow,
  createState,
  memo,
  mounted,
  effect,
} from '@mantou/gem';
import type { RGBA } from 'duoyun-ui/lib/color';
import { rgbToRgbColor } from 'duoyun-ui/lib/color';
import { formatTraffic } from 'duoyun-ui/lib/number';

// eslint-disable-next-line import/default
import Worker from './worker?worker';

import 'duoyun-ui/elements/radio';
import '../elements/layout';
import './fps';

@customElement('app-pixel')
@shadow()
export class Pixel extends GemElement {
  @attribute color: string;
  @numattribute ratio: number;
  render() {
    return html`
      <style>
        :host {
          width: ${this.ratio}px;
          height: ${this.ratio}px;
          background: ${this.color};
        }
      </style>
    `;
  }
}

const style = css`
  :host {
    display: grid;
    place-items: center;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
  }
  canvas {
    position: absolute;
    opacity: 0.5;
    right: 0;
    top: 0;
    width: 200px;
  }
  .info {
    display: flex;
    align-items: center;
    gap: 1em;
  }
  .grid {
    display: grid;
  }
`;

@customElement('app-root')
@adoptedStyle(style)
@shadow()
export class App extends GemElement {
  #canvasRef = createRef<HTMLCanvasElement>();

  #state = createState({
    canvasKey: 0,
    ratio: 10,
    width: 0,
    height: 0,
    pixels: new Uint8ClampedArray(),
  });

  #pixelsPosition: number[] = [];

  @memo((i) => [i.#state.width, i.#state.height, i.#state.ratio])
  #setPixelsPosition = () => {
    const { width, height, ratio } = this.#state;
    this.#pixelsPosition = Array.from({ length: (height * width) / ratio / ratio }, (_, i) => i * 4);
  };

  #worker = new Worker();

  @mounted()
  #init = () => {
    this.#worker.addEventListener('message', (evt) => {
      const { width, height, pixels, canvasKey } = evt.data;
      this.#state({ width, height, canvasKey, pixels: new Uint8ClampedArray(pixels) });
    });
  };

  @effect((i) => [i.#state.canvasKey, i.#state.ratio])
  #changeSettings = () => {
    const offscreenCanvas = this.#canvasRef.value!.transferControlToOffscreen();
    this.#worker.postMessage(
      {
        ratio: this.#state.ratio,
        canvas: offscreenCanvas,
      },
      [offscreenCanvas],
    );
  };

  #options = [{ label: '40' }, { label: '20' }, { label: '10' }];

  #onChange = (evt: CustomEvent<string>) => this.#state({ ratio: Number(evt.detail) });

  render() {
    const { canvasKey, width, height, ratio, pixels } = this.#state;
    const { number, unit } = formatTraffic((performance as any).memory.usedJSHeapSize);
    return html`
      <style>
        .grid {
          grid-template-columns: repeat(${width / ratio}, 1fr);
        }
      </style>
      <div class="info">
        <span>Memory: ${number}${unit}</span>
        <nesbox-fps></nesbox-fps>
        Radio:
        <dy-radio-group disabled @change=${this.#onChange} .value=${String(ratio)} .options=${this.#options}>
        </dy-radio-group>
      </div>
      ${repeat(
        [canvasKey],
        (k) => k,
        () => html`<canvas ${this.#canvasRef} width=${width / ratio} height=${height / ratio}></canvas>`,
      )}
      <div class="grid">
        ${repeat(
          this.#pixelsPosition,
          (_, i) => i,
          (index) => {
            const color = pixels.slice(index, index + 4) as unknown as RGBA;
            return html`<app-pixel ratio=${ratio} color=${rgbToRgbColor(color)}></app-pixel>`;
          },
        )}
      </div>
    `;
  }
}

render(
  html`
    <gem-examples-layout>
      <app-root></app-root>
    </gem-examples-layout>
  `,
  document.body,
);
