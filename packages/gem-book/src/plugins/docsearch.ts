import type { RefObject } from '@mantou/gem';

import type { GemBookElement } from '../element';

const moduleLink = 'https://cdn.skypack.dev/@docsearch/js@3.0.0-alpha.50';
const styleLink = 'https://unpkg.com/@docsearch/css@3.0.0-alpha.50/dist/style.css';

customElements.whenDefined('gem-book').then(async () => {
  const { GemBookPluginElement } = customElements.get('gem-book') as typeof GemBookElement;
  const { Gem, theme } = GemBookPluginElement;
  const { css, html, customElement, attribute, refobject } = Gem;

  @customElement('gbp-docsearch')
  class _GbpDocsearchElement extends GemBookPluginElement {
    @attribute appId: string;
    @attribute apiKey: string;
    @attribute indexName: string;
    @refobject searchRef: RefObject<HTMLInputElement>;

    state = {
      style: '',
    };

    render() {
      return html`
        <style>
          ${this.state.style}
        </style>
        <style>
          :host,
          host > div {
            display: contents;
          }
          :root {
            --ifm-z-index-fixed: 123;
          }
          .DocSearch-Button {
            margin: 0;
          }
        </style>
        <div ref=${this.searchRef.ref}></div>
      `;
    }

    mounted = async () => {
      const [text, { default: docSearch }] = await Promise.all([
        (await fetch(styleLink)).text(),
        await import(/* webpackIgnore: true */ moduleLink),
      ]);
      this.setState({ style: text });
      const style = document.createElement('style');
      style.textContent =
        text +
        css`
          :root {
            --docsearch-logo-color: ${theme.primaryColor};
            --docsearch-primary-color: ${theme.primaryColor};
          }
          .DocSearch {
            font-family: ${theme.font};
          }
        `;
      document.head.append(style);
      docSearch({
        appId: this.appId || undefined,
        apiKey: this.apiKey,
        indexName: this.indexName,
        container: this.searchRef.element,
      });
    };
  }
});
