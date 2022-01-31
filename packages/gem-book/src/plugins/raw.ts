import type { GemBookElement } from '../element';

customElements.whenDefined('gem-book').then(() => {
  const { GemBookPluginElement } = customElements.get('gem-book') as typeof GemBookElement;
  const { config, Gem, devMode } = GemBookPluginElement;
  const { attribute, customElement } = Gem;

  @customElement('gbp-raw')
  class _GbpRawElement extends GemBookPluginElement {
    @attribute src: string;
    @attribute codelang: string;
    @attribute range: string;
    @attribute highlight: string;

    mounted() {
      this.#renderContent();
    }

    updated() {
      this.#renderContent();
    }

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

    async #renderContent() {
      if (!this.src) return;
      this.innerHTML = 'Loading...';

      const text = await (await fetch(this.#getRemoteUrl())).text();
      const div = document.createElement('div');
      div.textContent = text;
      const content = div.innerHTML;

      const extension = this.src.split('.').pop() || '';
      this.innerHTML = `<gem-book-pre codelang="${this.codelang || extension}" highlight="${this.highlight}" range="${
        this.range
      }">${content}</gem-book-pre>`;
    }
  }
});
