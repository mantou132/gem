import type { GemBookElement } from '../element';

const { GemBookPluginElement } = (await customElements.whenDefined('gem-book')) as typeof GemBookElement;
const { Gem } = GemBookPluginElement;
const { customElement, html, attribute, shadow } = Gem;

@customElement('gbp-content')
@shadow()
class _GbpContentElement extends GemBookPluginElement {
  @attribute method: 'prepend' | 'append';

  render() {
    const bookEle = document.querySelector<GemBookElement>('gem-book');
    return html`
      <gem-reflect
        .method=${this.method}
        .target=${bookEle?.querySelector<HTMLSlotElement>(`slot[name=${this.slot}]`) || document.head}
      >
        ${[...this.children].map((e) => e.cloneNode(true))}
      </gem-reflect>
    `;
  }
}
