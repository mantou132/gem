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
} from '@mantou/gem';

import { configureStore } from '../store';
import { execution } from '../common';
import { getAllFrames } from '../scripts/get-all-frame';

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
  #onChange = (evt: Event) => {
    configureStore({ currentFrameURL: (evt.target as HTMLSelectElement).value });
  };

  @mounted()
  #init = () => {
    const timer = setInterval(async () => {
      const frames = await execution(getAllFrames, [], { frameURL: undefined });
      configureStore({
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
