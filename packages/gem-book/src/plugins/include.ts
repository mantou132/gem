import type { GemBookElement } from '../element';

type State = {
  content: Element[];
  error?: any;
};

customElements.whenDefined('gem-book').then(({ GemBookPluginElement }: typeof GemBookElement) => {
  const { Gem, theme, Utils } = GemBookPluginElement;
  const { attribute, customElement, html } = Gem;

  @customElement('gbp-include')
  class _GbpIncludeElement extends GemBookPluginElement<State> {
    @attribute src: string;
    @attribute range: string;

    constructor() {
      super();
      this.cacheState(() => [this.src, this.range]);
    }

    state: State = {
      content: [],
    };

    mounted() {
      this.dataset.styleScope = 'false';
      this.effect(
        async () => {
          const url = Utils.getRemoteURL(this.src);
          if (!url) return;
          this.setState({ error: false });
          try {
            const resp = await fetch(url);
            if (resp.status === 404) throw new Error(resp.statusText || 'Not Found');
            const md = await resp.text();
            const lines = md.split(/\n|\r\n/);
            const ranges = Utils.getRanges(this.range, lines);
            const { parts } = Utils.getParts(lines, ranges);
            this.setState({ content: Utils.parseMarkdown(parts.join('\n')) });
          } catch (error) {
            this.setState({ error });
          }
        },
        () => [this.src, this.range],
      );
    }

    render() {
      const { content, error } = this.state;
      if (error) return html`<div style="color: ${theme.cautionColor};">${error}</div>`;
      if (!content) return html`<div style="color: rgb(from ${theme.textColor} r g b / 0.6);">Loading...</div>`;

      return html`${content}`;
    }
  }
});
