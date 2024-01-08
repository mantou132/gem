import type { GemBookElement } from '../element';

type State = {
  content: Element[];
  error?: any;
};

customElements.whenDefined('gem-book').then(({ GemBookPluginElement }: typeof GemBookElement) => {
  const { Gem, config } = GemBookPluginElement;
  const { customElement, html } = Gem;

  @customElement('gbp-var')
  class _GbpVarElement extends GemBookPluginElement<State> {
    mounted() {
      new MutationObserver(() => this.update()).observe(this, {
        childList: true,
        characterData: true,
        subtree: true,
      });
    }

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
