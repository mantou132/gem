import type { GemBookElement } from '../element';

const esmBuilder = 'https://esm.sh/build';

customElements.whenDefined('gem-book').then(async () => {
  const { build } = await import(/* webpackIgnore: true */ esmBuilder);

  const { GemBookPluginElement } = customElements.get('gem-book') as typeof GemBookElement;
  const { Gem } = GemBookPluginElement;
  const { html, customElement, attribute } = Gem;

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
          return { ...p, [name]: version };
        },
        {} as Record<string, string>,
      );
    }

    mounted() {
      this.effect(
        async () => {
          const url = this.getRemoteURL(this.src);
          if (!url) return;
          try {
            const resp = await fetch(url);
            if (resp.status === 404) throw new Error(resp.statusText || 'Not Found');
            const content = await resp.text();
            const ret = await build({
              dependencies: this.#dependencies,
              code: `
                const GemBookPluginElement = customElements.get('gem-book').GemBookPluginElement;
                ${content}
              `,
            });
            await import(/* webpackIgnore: true */ ret.url);
          } catch (error) {
            this.error(error);
          }
        },
        () => [this.src],
      );
    }

    render() {
      return html`
        <style>
          :host {
            display: none;
          }
        </style>
      `;
    }
  }
});
