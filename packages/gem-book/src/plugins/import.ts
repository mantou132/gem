import type { GemBookElement } from '../element';

const esmBuilder = 'https://esm.sh/build';

customElements.whenDefined('gem-book').then(({ GemBookPluginElement }: typeof GemBookElement) => {
  const esmBuilderPromise = import(/* webpackIgnore: true */ esmBuilder);

  const { Gem, Utils } = GemBookPluginElement;
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
          const url = Utils.getRemoteURL(this.src);
          if (!url) return;
          try {
            const resp = await fetch(url);
            if (resp.status === 404) throw new Error(resp.statusText || 'Not Found');
            const content = await resp.text();
            if (new URL(url, location.origin).pathname.endsWith('.js')) {
              return await import(/* webpackIgnore: true */ url);
            }
            const ret = await (
              await esmBuilderPromise
            ).build({
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
