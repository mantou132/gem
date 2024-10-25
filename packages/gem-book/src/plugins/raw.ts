import type { GemBookElement } from '../element';

type State = {
  content: string;
  error?: any;
};

const { GemBookPluginElement } = (await customElements.whenDefined('gem-book')) as typeof GemBookElement;
const { Gem, theme, Utils } = GemBookPluginElement;
const { attribute, customElement, html, createCSSSheet, adoptedStyle, createState, effect } = Gem;

const style = createCSSSheet`
  :scope {
    display: contents;
  }
  .loading,
  .error {
    display: flex;
    border-radius: ${theme.normalRound};
    place-items: center;
    place-content: center;
    min-height: 20em;
    background: rgb(from ${theme.textColor} r g b / 0.05);
  }
  .loading {
    color: rgb(from ${theme.textColor} r g b / 0.6);
  }
  .error {
    color: ${theme.cautionColor};
  }
  gem-book-pre {
    margin: 2rem 0px;
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
`;

@customElement('gbp-raw')
@adoptedStyle(style)
class _GbpRawElement extends GemBookPluginElement {
  @attribute src: string;
  @attribute codelang: string;
  @attribute range: string;
  @attribute highlight: string;

  constructor() {
    super();
    this.cacheState(() => [this.src]);
  }

  state = createState<State>({
    content: '',
  });

  get #codeLang() {
    return this.codelang || this.src.split('.').pop() || '';
  }

  @effect((i) => [i.src])
  #init = async () => {
    const url = Utils.getRemoteURL(this.src);
    if (!url) return;
    this.state({ error: false });
    try {
      const resp = await fetch(url);
      if (resp.status === 404) throw new Error(resp.statusText || 'Not Found');
      this.state({ content: await resp.text() });
    } catch (error) {
      this.state({ error });
    }
  };

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
