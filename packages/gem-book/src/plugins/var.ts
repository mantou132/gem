import type { GemBookElement } from '../element';

customElements.whenDefined('gem-book').then(({ GemBookPluginElement }: typeof GemBookElement) => {
  const { Gem, config } = GemBookPluginElement;
  const { customElement, html, shadow, mounted } = Gem;

  @customElement('gbp-var')
  @shadow()
  class _GbpVarElement extends GemBookPluginElement {
    @mounted()
    #init = () => {
      const ob = new MutationObserver(() => this.update());
      ob.observe(this, { childList: true, characterData: true, subtree: true });
      return () => ob.disconnect();
    };

    render() {
      const paths = (this.textContent || '').split('.');
      try {
        return html`${paths.reduce((p, prop) => p[prop], config.global)}`;
      } catch {
        return html`<slot></slot>`;
      }
    }
  }
});
