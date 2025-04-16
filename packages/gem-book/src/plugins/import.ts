import type { GemBookElement } from '../element';

const esmBuilder = 'https://esm.sh/build';

const { GemBookPluginElement } = (await customElements.whenDefined('gem-book')) as typeof GemBookElement;
const esmBuilderPromise = import(/* webpackIgnore: true */ esmBuilder);

const { Gem, Utils } = GemBookPluginElement;
const { customElement, attribute, effect } = Gem;

@customElement('gbp-import')
class _GbpImportElement extends GemBookPluginElement {
  @attribute src: string;
  @attribute dependencies: string;

  get #dependencies() {
    const deps = this.dependencies.split(/\s*,\s*/);
    return deps.reduce(
      (p, c) => {
        if (!c) return p;
        const [name, version = 'latest'] = c.split(/(.+)@/).filter((e) => !!e);
        p[name] = version;
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
      const content = await resp.text();
      if (new URL(url, location.origin).pathname.endsWith('.js')) {
        return await import(/* webpackIgnore: true */ url);
      }
      const { build } = await esmBuilderPromise;
      const ret = await build({
        dependencies: this.#dependencies,
        source: `
            const GemBookPluginElement = customElements.get('gem-book').GemBookPluginElement;
            ${content}
          `,
      });
      await import(/* webpackIgnore: true */ ret.url);
    } catch (error) {
      this.error(error);
    }
  };
}
