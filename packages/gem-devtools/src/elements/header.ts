import {
  GemElement,
  html,
  adoptedStyle,
  customElement,
  createCSSSheet,
  css,
  connectStore,
  styleMap,
} from '@mantou/gem';

import { changeConfigureStore, configureStore } from '../store';
import { execution } from '../common';
import { getAllFrames } from '../scripts/get-all-frame';

const style = createCSSSheet(css`
  :host {
    display: flex;
    line-height: 1.5;
  }
  .title {
    font-style: italic;
    opacity: 0.5;
    flex-grow: 1;
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
`);

/**
 * @customElement devtools-header
 */
@customElement('devtools-header')
@adoptedStyle(style)
@connectStore(configureStore)
export class DevtoolsHeaderElement extends GemElement {
  #onChange = (evt: Event) => {
    changeConfigureStore({ currentFrameURL: (evt.target as HTMLSelectElement).value });
  };

  mounted = () => {
    const timer = setInterval(async () => {
      const frames = await execution(getAllFrames, [], { frameURL: undefined });
      changeConfigureStore({
        frames,
        currentFrameURL: frames.includes(configureStore.currentFrameURL) ? configureStore.currentFrameURL : '',
      });
    }, 1000);
    return () => clearInterval(timer);
  };

  render = () => {
    return html`
      <div class="title"><slot></slot></div>
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
