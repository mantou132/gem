import type { GemBookElement } from '../element';

const { GemBookPluginElement } = (await customElements.whenDefined('gem-book')) as typeof GemBookElement;

const { Gem, Utils } = GemBookPluginElement;
const { customElement, attribute, effect, state, adoptedStyle, css } = Gem;

const style = css`
  :scope:not(:state(finished)) {
    display: inline-block;
    width: attr(width px);
    height: attr(height px);
  }
`;

@customElement('gbp-import')
@adoptedStyle(style)
class _GbpImportElement extends GemBookPluginElement {
  @attribute name: string;
  @attribute src: string;
  @attribute dependencies: string;
  @state finished: boolean;

  get #importMap() {
    const deps = this.dependencies.split(/\s*,\s*/);
    return deps.reduce(
      (p, c) => {
        if (!c) return p;
        const [name, version = 'latest'] = c.split(/(.+)@/).filter((e) => !!e);
        p[name] = `https://esm.sh/${name}@${version}`;
        return p;
      },
      {} as Record<string, string>,
    );
  }

  @effect((i) => [i.src])
  #init = async () => {
    const url = Utils.getRemoteURL(this.src);
    if (!url) return;
    try {
      const resp = await fetch(url);
      if (resp.status === 404) throw new Error(resp.statusText || 'Not Found');
      const source = await resp.text();
      if (new URL(url, location.origin).pathname.endsWith('.js')) {
        return await import(/* webpackIgnore: true */ url);
      }
      const body = JSON.stringify({
        lang: 'ts',
        code: source,
        target: 'es2022',
        minify: !GemBookPluginElement.devMode,
        importMap: { imports: this.#importMap },
      });
      const res = await fetch('https://esm.sh/transform', { method: 'POST', body });
      const { code } = await res.json();
      const base64 = btoa(unescape(encodeURIComponent(code)));
      await import(/* webpackIgnore: true */ `data:text/javascript;base64,${base64}`);
    } catch (error) {
      this.error(error);
    } finally {
      this.finished = true;
      if (this.name) {
        this.after(document.createElement(this.name));
      }
    }
  };
}
