import type { GemBookElement } from '../element';

customElements.whenDefined('gem-book').then(({ GemBookPluginElement }: typeof GemBookElement) => {
  const { Gem } = GemBookPluginElement;
  const { customElement, html, attribute } = Gem;

  @customElement('gbp-content')
  class _GbpContentElement extends GemBookPluginElement {
    @attribute method: 'prepend' | 'append';

    render() {
      const bookEle = document.querySelector('gem-book');
      return html`
        <gem-reflect .method=${this.method} .target=${bookEle}>
          ${[...this.children].map((e) => e.cloneNode(true))}
        </gem-reflect>
      `;
    }
  }
});
