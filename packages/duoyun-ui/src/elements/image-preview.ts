import {
  adoptedStyle,
  customElement,
  attribute,
  property,
  numattribute,
  shadow,
  effect,
} from '@mantou/gem/lib/decorators';
import { createCSSSheet, createState, GemElement, html } from '@mantou/gem/lib/element';
import { css } from '@mantou/gem/lib/utils';
import { useDecoratorTheme } from '@mantou/gem/helper/theme';

import { theme, getSemanticColor } from '../lib/theme';
import { compressionImage } from '../lib/image';
import { icons } from '../lib/icons';
import { commonHandle } from '../lib/hotkeys';
import { focusStyle } from '../lib/styles';

import './use';

const [elementTheme, updateTheme] = useDecoratorTheme({ color: '', progress: '' });

const style = createCSSSheet(css`
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
    background: linear-gradient(to top, ${elementTheme.color} ${elementTheme.progress}, transparent ${elementTheme.progress});,
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
`);

type Action = {
  icon: string | Element | DocumentFragment;
  handle: () => void;
};

export type ImageStatus = 'negative' | 'positive' | 'default';

/**
 * @customElement dy-image-preview
 */
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

  @updateTheme()
  #theme = () => ({
    progress: `${this.progress}%`,
    color: this.progress ? theme.informativeColor : getSemanticColor(this.#status) || 'none',
  });

  render = () => {
    if (!this.file) return html``;
    const { previewUrl } = this.#state;
    return html`
      ${previewUrl ? html`<img class="preview" alt=${this.file.name} src=${previewUrl}></img>` : ''}
      ${this.progress
        ? html`
            <div class="mask status progress"></div>
            <div class="desc" role="progressbar">${Math.floor(this.progress)}%</div>
          `
        : this.#status !== 'default'
          ? html`
              <div class="mask status">
                <dy-use class="icon" .element=${this.#icon}></dy-use>
              </div>
            `
          : this.actions
            ? html`
                <div class="mask">
                  ${this.actions.map(
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
              `
            : ''}
    `;
  };
}
