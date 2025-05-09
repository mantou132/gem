import { createDecoratorTheme } from '@mantou/gem/helper/theme';
import {
  adoptedStyle,
  attribute,
  customElement,
  effect,
  numattribute,
  property,
  shadow,
} from '@mantou/gem/lib/decorators';
import { createState, css, GemElement, html } from '@mantou/gem/lib/element';

import { commonHandle } from '../lib/hotkeys';
import { icons } from '../lib/icons';
import { compressionImage } from '../lib/image';
import { focusStyle } from '../lib/styles';
import { getSemanticColor, theme } from '../lib/theme';

import './use';

const elementTheme = createDecoratorTheme({ color: '', progress: '' });

const style = css`
  :host {
    position: relative;
    aspect-ratio: 1;
    background: conic-gradient(
        transparent 0.25turn,
        #d3cfcf 0.25turn 0.5turn,
        transparent 0.5turn 0.75turn,
        #d3cfcf 0.75turn
      )
      top left / 1.2em 1.2em repeat;
  }
  :host,
  .mask {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  :host(:not(:hover)) .mask:not(.status) {
    display: none;
  }
  .preview,
  .mask {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  .desc {
    position: relative;
    color: ${theme.backgroundColor};
    background: ${elementTheme.color};
    border-radius: 10em;
    padding: 0 0.5em;
    line-height: 1.5;
  }
  .mask {
    background-color: rgba(0, 0, 0, calc(${theme.maskAlpha} + 0.4));
  }
  .progress {
    opacity: 0.4;
    background: linear-gradient(
      to top,
      ${elementTheme.color} ${elementTheme.progress},
      transparent ${elementTheme.progress}
    );
  }
  .icon {
    width: 1.5em;
    color: ${theme.backgroundColor};
  }
  .mask:not(.status) .icon {
    cursor: pointer;
  }
  .status .icon {
    color: ${elementTheme.color};
  }
`;

type Action = {
  icon: string | Element | DocumentFragment;
  handle: () => void;
};

export type ImageStatus = 'negative' | 'positive' | 'default';

@customElement('dy-image-preview')
@adoptedStyle(style)
@adoptedStyle(focusStyle)
@shadow({ delegatesFocus: true })
export class DuoyunImagePreviewElement extends GemElement {
  @attribute status: ImageStatus;
  /**0-100 */
  @numattribute progress: number;

  @property file?: File;
  @property actions?: Action[];

  get #status() {
    return this.status || 'default';
  }

  get #icon() {
    switch (this.#status) {
      case 'negative':
        return icons.close;
      case 'positive':
        return icons.check;
    }
  }

  #state = createState({
    previewUrl: '',
  });

  @effect((i) => [i.file])
  #updatePreviewImg = async () => {
    if (this.file) {
      const dimension = 64 * window.devicePixelRatio;
      const previewUrl = await compressionImage(
        this.file,
        { dimension: { width: dimension, height: dimension } },
        { type: 'url', aspectRatio: 1 },
      );
      this.#state({ previewUrl });
    }
  };

  @elementTheme()
  #theme = () => ({
    progress: `${this.progress}%`,
    color: this.progress ? theme.informativeColor : getSemanticColor(this.#status) || 'none',
  });

  render = () => {
    if (!this.file) return html``;
    const { previewUrl } = this.#state;
    return html`
      <img v-if=${!!previewUrl} class="preview" alt=${this.file.name} src=${previewUrl}></img>
      <div v-if=${!!this.progress} class="mask status progress"></div>
      <div v-if=${!!this.progress} class="desc" role="progressbar">${Math.floor(this.progress)}%</div>
      <div v-else-if=${this.#status !== 'default'} class="mask status">
        <dy-use class="icon" .element=${this.#icon}></dy-use>
      </div>
      <div v-else-if=${!!this.actions} class="mask">
        ${this.actions?.map(
          ({ icon, handle }) => html`
            <dy-use
              class="icon"
              .element=${icon}
              role="button"
              tabindex="0"
              @keydown=${commonHandle}
              @click=${() => handle()}
            ></dy-use>
          `,
        )}
      </div>
    `;
  };
}
