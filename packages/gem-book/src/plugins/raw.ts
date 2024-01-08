import type { GemBookElement } from '../element';

type State = {
  content: string;
  error?: any;
};

customElements.whenDefined('gem-book').then(({ GemBookPluginElement }: typeof GemBookElement) => {
  const { Gem, theme, Utils } = GemBookPluginElement;
  const { attribute, customElement, html, createCSSSheet, css, adoptedStyle } = Gem;

  const style = createCSSSheet(css`
    :host {
      display: contents;
    }
    .loading,
    .error {
      display: flex;
      place-items: center;
      place-content: center;
      min-height: 20em;
      background: rgba(${theme.textColorRGB}, 0.05);
    }
    .loading {
      opacity: 0.5;
    }
    .error {
      color: ${theme.cautionColor};
    }
    gem-book-pre {
      margin: 2rem 0px;
      border-radius: ${theme.normalRound};
      animation: display 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }
    @keyframes display {
      0% {
        opacity: 0;
      }
      100% {
        opacity: 1;
      }
    }
  `);

  @customElement('gbp-raw')
  @adoptedStyle(style)
  class _GbpRawElement extends GemBookPluginElement<State> {
    @attribute src: string;
    @attribute codelang: string;
    @attribute range: string;
    @attribute highlight: string;

    constructor() {
      super();
      this.cacheState(() => [this.src]);
    }

    state: State = {
      content: '',
    };

    get #codeLang() {
      return this.codelang || this.src.split('.').pop() || '';
    }

    mounted() {
      this.effect(
        async () => {
          const url = Utils.getRemoteURL(this.src);
          if (!url) return;
          this.setState({ error: false });
          try {
            const resp = await fetch(url);
            if (resp.status === 404) throw new Error(resp.statusText || 'Not Found');
            this.setState({ content: await resp.text() });
          } catch (error) {
            this.setState({ error });
          }
        },
        () => [this.src],
      );
    }

    render() {
      const { content, error } = this.state;
      if (error) return html`<div class="error">${error}</div>`;
      if (!content) return html`<div class="loading">Loading...</div>`;

      return html`
        <gem-book-pre codelang=${this.#codeLang} highlight=${this.highlight} filename=${this.src} range=${this.range}
          >${content}</gem-book-pre
        >
      `;
    }
  }
});
