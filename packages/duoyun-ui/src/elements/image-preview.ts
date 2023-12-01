import { adoptedStyle, customElement, attribute, property, numattribute } from '@mantou/gem/lib/decorators';
import { GemElement, html } from '@mantou/gem/lib/element';
import { createCSSSheet, css, styleMap } from '@mantou/gem/lib/utils';

import { theme, getSemanticColor } from '../lib/theme';
import { compressionImage } from '../lib/image';
import { icons } from '../lib/icons';
import { commonHandle } from '../lib/hotkeys';
import { focusStyle } from '../lib/styles';

import './use';

const style = createCSSSheet(css`
  :host {
    --color: initial;
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
    background: var(--color);
    border-radius: 10em;
    padding: 0 0.5em;
    line-height: 1.5;
  }
  .mask {
    background-color: rgba(0, 0, 0, calc(${theme.maskAlpha} + 0.4));
  }
  .icon {
    width: 1.5em;
    color: ${theme.backgroundColor};
  }
  .mask:not(.status) .icon {
    cursor: pointer;
  }
  .status .icon {
    color: var(--color);
  }
`);

type State = {
  previewUrl: string;
};

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
export class DuoyunImagePreviewElement extends GemElement<State> {
  @attribute status: ImageStatus;
  /**0-100 */
  @numattribute progress: number;

  @property file?: File;
  @property actions?: Action[];

  get #status() {
    return this.status || 'default';
  }

  get #color() {
    return getSemanticColor(this.#status);
  }

  get #icon() {
    switch (this.#status) {
      case 'negative':
        return icons.close;
      case 'positive':
        return icons.check;
    }
  }

  state: State = {
    previewUrl: '',
  };

  mounted = () => {
    const dimension = 64 * window.devicePixelRatio;
    this.effect(
      async () => {
        if (this.file) {
          const previewUrl = await compressionImage(
            this.file,
            { dimension: { width: dimension, height: dimension } },
            { type: 'url', aspectRatio: 1 },
          );
          this.setState({ previewUrl });
        }
      },
      () => [this.file],
    );
  };

  render = () => {
    if (!this.file) return;
    const { previewUrl } = this.state;
    const color = this.progress ? theme.informativeColor : this.#color;
    return html`
      ${color
        ? html`
            <style>
              :host {
                --color: ${color} !important;
              }
            </style>
          `
        : ''}
      ${previewUrl ? html`<img class="preview" alt=${this.file.name} src=${previewUrl}></img>` : ''}
      ${this.progress
        ? html`
            <div
              class="mask status"
              style=${styleMap({
                opacity: '0.4',
                background: `linear-gradient(to top, ${color} ${this.progress}%, transparent ${this.progress}%);`,
              })}
            ></div>
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
