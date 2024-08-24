import type { GemBookElement } from '../element';

type State = {
  content: Element[];
  error?: any;
};

const { GemBookPluginElement } = (await customElements.whenDefined('gem-book')) as typeof GemBookElement;
const { Gem, theme, Utils } = GemBookPluginElement;
const { attribute, customElement, html, BoundaryCSSState, createState, effect } = Gem;

@customElement('gbp-include')
class _GbpIncludeElement extends GemBookPluginElement {
  @attribute src: string;
  @attribute range: string;

  constructor() {
    super();
    this.cacheState(() => [this.src, this.range]);
    this.internals.states.delete(BoundaryCSSState);
  }

  state = createState<State>({
    content: [],
  });

  @effect((i) => [i.src, i.range])
  #init = async () => {
    const url = Utils.getRemoteURL(this.src);
    if (!url) return;
    this.state({ error: false });
    try {
      const resp = await fetch(url);
      if (resp.status === 404) throw new Error(resp.statusText || 'Not Found');
      const md = await resp.text();
      const lines = md.split(/\n|\r\n/);
      const ranges = Utils.getRanges(this.range, lines);
      const { parts } = Utils.getParts(lines, ranges);
      this.state({ content: Utils.parseMarkdown(parts.join('\n')) });
    } catch (error) {
      this.state({ error });
    }
  };

  render() {
    const { content, error } = this.state;
    if (error) return html`<div style="color: ${theme.cautionColor};">${error}</div>`;
    if (!content) return html`<div style="color: rgb(from ${theme.textColor} r g b / 0.6);">Loading...</div>`;

    return html`${content}`;
  }
}
