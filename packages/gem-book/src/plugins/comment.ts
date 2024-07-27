import type { GemBookElement } from '../element';

const gitalkUrl = 'https://esm.sh/gitalk@1.7.2';
const gitalkCSSUrl = 'https://esm.sh/gitalk@1.7.2/dist/gitalk.css';

customElements.whenDefined('gem-book').then(async ({ GemBookPluginElement }: typeof GemBookElement) => {
  const { config, Gem, theme, locationStore } = GemBookPluginElement;
  const { html, customElement, attribute, connectStore, shadow, adoptedStyle, css, createCSSSheet } = Gem;

  const style = createCSSSheet(css`
    :host {
      display: contents;
    }
    .gt-container .gt-meta {
      border-color: ${theme.borderColor};
    }
    .gt-container .gt-comment-username,
    .gt-container a,
    .gt-container a:hover,
    .gt-container .gt-header-controls-tip,
    .gt-container .gt-svg svg {
      color: ${theme.primaryColor};
      fill: ${theme.primaryColor};
    }
    .gt-container .gt-btn-preview,
    .gt-container .gt-btn-preview:hover {
      border-color: currentColor;
      background-color: transparent;
      color: ${theme.primaryColor};
    }
    .gt-container .gt-btn-public,
    .gt-container .gt-btn-public:hover {
      border-color: ${theme.primaryColor};
      background-color: ${theme.primaryColor};
      color: ${theme.backgroundColor};
    }
    .gt-container .gt-btn-preview:hover,
    .gt-container .gt-btn-public:hover {
      color: rgb(from ${theme.textColor} r g b / 0.8);
    }
    .gt-container .gt-header-textarea {
      border-color: rgb(from ${theme.textColor} r g b / 0.1);
      background-color: rgb(from ${theme.textColor} r g b / 0.05);
    }
    .gt-container .gt-header-textarea:hover,
    .gt-container .gt-header-textarea:focus {
      background-color: transparent;
    }
    .gt-container .gt-comment-content {
      background: rgb(from ${theme.primaryColor} r g b / 0.05);
    }
  `);
  @customElement('gbp-comment')
  @connectStore(locationStore)
  @adoptedStyle(style)
  @shadow()
  class _GbpCommentElement extends GemBookPluginElement {
    @attribute clientID: string;
    @attribute clientSecret: string;
    @attribute repo: string;
    @attribute owner: string;
    @attribute admin: string;

    render() {
      return html`
        <link rel="stylesheet" href=${gitalkCSSUrl} />
        <div id="comment"></div>
      `;
    }

    async init() {
      const { github } = config;
      const ele = this.shadowRoot?.querySelector('#comment');
      if (!ele) return;
      ele.innerHTML = '';
      const { default: Gitalk } = await import(/* webpackIgnore: true */ gitalkUrl);
      const [_, owner, repo] = github ? new URL(github).pathname.split('/') : [];
      new Gitalk({
        clientID: this.clientID,
        clientSecret: this.clientSecret,
        repo: this.repo || repo,
        owner: this.owner || owner,
        admin: [owner].concat(this.admin.split(',')),
        id: `${location.origin}${locationStore.path}`,
        distractionFreeMode: false,
        language: GemBookPluginElement.lang,
      }).render(ele);
    }

    mounted() {
      this.effect(
        () => this.init(),
        () => [locationStore.path],
      );
    }
  }
});
