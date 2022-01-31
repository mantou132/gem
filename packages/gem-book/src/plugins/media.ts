import type { GemBookElement } from '../element';

type MediaType = 'img' | 'video' | 'audio' | 'unknown';

customElements.whenDefined('gem-book').then(() => {
  const { GemBookPluginElement } = customElements.get('gem-book') as typeof GemBookElement;
  const { Gem, config, theme, devMode } = GemBookPluginElement;
  const { html, customElement, attribute } = Gem;

  @customElement('gbp-media')
  class _GbpMediaElement extends GemBookPluginElement {
    @attribute src: string;
    @attribute type: MediaType;
    @attribute width: string;
    @attribute height: string;

    #getRemoteUrl() {
      if (!this.src) return '';

      let url = this.src;
      if (!/^(https?:)?\/\//.test(this.src)) {
        if (!config.github || !config.sourceBranch) return '';
        const rawOrigin = 'https://raw.githubusercontent.com';
        const repo = new URL(config.github).pathname;
        const src = `${this.src.startsWith('/') ? '' : '/'}${this.src}`;
        const basePath = config.base ? `/${config.base}` : '';
        url = devMode ? `/_assets${src}` : `${rawOrigin}${repo}/${config.sourceBranch}${basePath}${src}`;
      }
      return url;
    }

    #detectType(): MediaType {
      // https://developer.mozilla.org/en-US/docs/Web/Media/Formats
      const ext = this.src.split('.').pop() || '';
      if (/a?png|jpe?g|gif|webp|avif|svg/.test(ext)) {
        return 'img';
      }
      if (/mp4|webm|av1/.test(ext)) {
        return 'video';
      }
      if (/mp3|ogg/.test(ext)) {
        return 'img';
      }
      return 'unknown';
    }

    #renderUnknownContent() {
      return html`
        <style>
          :host::before {
            display: block;
            content: 'Unknown format';
            padding: 1em;
            border-radius: 4px;
            text-align: center;
            background: ${theme.borderColor};
          }
        </style>
      `;
    }

    #renderImage() {
      return html`<img width=${this.width} height=${this.height} src=${this.#getRemoteUrl()} />`;
    }

    #renderVideo() {
      return html`<video width=${this.width} height=${this.height} src=${this.#getRemoteUrl()}></video>`;
    }

    #renderAudio() {
      return html`<audio src=${this.#getRemoteUrl()}></audio>`;
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
      return html`
        <style>
          :host {
            display: contents;
          }
        </style>
        ${this.#renderContent()}
      `;
    }
  }
});
