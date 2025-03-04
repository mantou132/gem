import {
  GemElement,
  html,
  adoptedStyle,
  customElement,
  css,
  connectStore,
  styleMap,
  shadow,
  mounted,
  createState,
} from '@mantou/gem';

import { configureStore } from '../store';
import { execution } from '../common';
import { getAllFrames } from '../scripts/get-all-frame';
import { appendScanElement, checkGemElement, checkScanElement } from '../scripts/scan';

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
  #state = createState({ showScanBtn: false });

  #onChange = (evt: Event) => {
    configureStore({ currentFrameURL: (evt.target as HTMLSelectElement).value });
  };

  @mounted()
  #initFrame = () => {
    const timer = setInterval(async () => {
      const frames = await execution(getAllFrames, [], { frameURL: undefined });
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
      this.#state({ showScanBtn: !hasScan });
    }, 1000);
    return () => clearInterval(timer);
  };

  #enableScan = async () => {
    await execution(appendScanElement, []);
    this.#state({ showScanBtn: false });
  };

  render = () => {
    return html`
      <div class="title"><slot></slot></div>
      <div class="btn" v-if=${this.#state.showScanBtn} @click=${this.#enableScan}>Scan</div>
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
