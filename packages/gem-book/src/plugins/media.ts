import type { GemBookElement } from '../element';

type MediaType = 'img' | 'video' | 'audio' | 'unknown';

customElements.whenDefined('gem-book').then(({ GemBookPluginElement }: typeof GemBookElement) => {
  const { Gem, theme, Utils } = GemBookPluginElement;
  const { html, customElement, attribute, state, createCSSSheet, css, adoptedStyle } = Gem;

  const styles = createCSSSheet(css`
    :scope {
      display: block;
      overflow: hidden;
      margin: 2rem 0px;
      border-radius: ${theme.normalRound};
    }
    img,
    audio,
    video {
      width: 100%;
      display: block;
    }
    :scope:state(unknown)::before {
      display: block;
      content: 'Unknown format';
      padding: 1em;
      border-radius: 4px;
      text-align: center;
      background: ${theme.borderColor};
      border-radius: ${theme.normalRound};
    }
  `);

  @customElement('gbp-media')
  @adoptedStyle(styles)
  class _GbpMediaElement extends GemBookPluginElement {
    @attribute src: string;
    @attribute type: MediaType;
    @attribute width: string;
    @attribute height: string;

    @state unknown: boolean;

    #detectType(): MediaType {
      this.unknown = false;
      // https://developer.mozilla.org/en-US/docs/Web/Media/Formats
      const ext = this.src.split('?')[0].split('.').pop() || '';
      if (/(a?png|jpe?g|gif|webp|avif|svg)$/.test(ext)) {
        return 'img';
      }
      if (/(mp4|webm|av1)$/.test(ext)) {
        return 'video';
      }
      if (/(mp3|ogg)$/.test(ext)) {
        return 'img';
      }
      this.unknown = true;
      return 'unknown';
    }

    #renderUnknownContent() {
      return html``;
    }

    #renderImage() {
      return html`<img width=${this.width} height=${this.height} src=${Utils.getRemoteURL(this.src)} />`;
    }

    #renderVideo() {
      return html`<video width=${this.width} height=${this.height} src=${Utils.getRemoteURL(this.src)}></video>`;
    }

    #renderAudio() {
      return html`<audio src=${Utils.getRemoteURL(this.src)}></audio>`;
    }

    #renderContent() {
      const type = this.type || this.#detectType();
      switch (type) {
        case 'img':
          return this.#renderImage();
        case 'video':
          return this.#renderVideo();
        case 'audio':
          return this.#renderAudio();
        default:
          return this.#renderUnknownContent();
      }
    }

    render() {
      return html`${this.#renderContent()}`;
    }
  }
});
