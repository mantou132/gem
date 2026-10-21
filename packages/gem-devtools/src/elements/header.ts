import {
  adoptedStyle,
  connectStore,
  createState,
  css,
  customElement,
  GemElement,
  html,
  mounted,
  shadow,
  styleMap,
  template,
} from '@mantou/gem';

import { execution } from '../common';
import { getAllFrames } from '../scripts/get-all-frame';
import { appendScanElement, checkGemElement, checkScanElement, removeScanElement } from '../scripts/scan';
import { configureStore } from '../store';

const style = css`
  :host {
    display: flex;
    line-height: 1.5;
    padding-inline: 0.5em;
  }
  .title {
    font-style: italic;
    opacity: 0.5;
    flex-grow: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .btn {
    border-inline-end: 1px solid;
    padding-inline-end: 0.2em;
    cursor: pointer;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  select {
    color: inherit;
    background: none;
    border: none;
    outline: none;
    min-width: 4em;
    max-width: 10em;
  }
`;

@customElement('devtools-header')
@adoptedStyle(style)
@connectStore(configureStore)
@shadow()
export class DevtoolsHeaderElement extends GemElement {
  // 页面没有 Gem 时为 `undefined`，不显示按钮
  #state = createState({ scanning: undefined as boolean | undefined });

  #onChange = (evt: Event) => {
    configureStore({ currentFrameURL: (evt.target as HTMLSelectElement).value });
  };

  @mounted()
  #initFrame = () => {
    const timer = setInterval(async () => {
      const { frames } = await execution(getAllFrames, [], { frameURL: undefined });
      configureStore({
        frames,
        currentFrameURL: frames.includes(configureStore.currentFrameURL) ? configureStore.currentFrameURL : '',
      });
    }, 1000);
    return () => clearInterval(timer);
  };

  @mounted()
  #initScan = async () => {
    const hasGem = await execution(checkGemElement, []);
    if (!hasGem) return;
    const timer = setInterval(async () => {
      const hasScan = await execution(checkScanElement, []);
      this.#state({ scanning: hasScan });
    }, 1000);
    return () => clearInterval(timer);
  };

  #toggleScan = async () => {
    const { scanning } = this.#state;
    await execution(scanning ? removeScanElement : appendScanElement, []);
    this.#state({ scanning: !scanning });
  };

  @template()
  #content = () => {
    return html`
      <div class="title"><slot></slot></div>
      <div class="btn" v-if=${this.#state.scanning !== undefined} @click=${this.#toggleScan}>
        ${this.#state.scanning ? 'Stop Scan' : 'Scan'}
      </div>
      <select
        @change=${this.#onChange}
        style=${styleMap({ width: `${configureStore.currentFrameURL.length * 0.5}em` })}
      >
        <option value="" ?selected=${!configureStore.currentFrameURL}>${'Top'}</option>
        ${configureStore.frames?.map(
          (frame) =>
            html`<option ?selected=${configureStore.currentFrameURL === frame} value=${frame}>${frame}</option>`,
        )}
      </select>
    `;
  };
}
