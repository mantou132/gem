import { GemElement, render, html } from '../../';
import '../../elements/link';

class Article extends GemElement {
  render() {
    return html`
      <div style="height: 1000px"><slot></slot></div>
    `;
  }
}
customElements.define('app-article', Article);

class App extends GemElement {
  render() {
    return html`
      <gem-link path="/" hash="#article-1"><button>go #article-1</button></gem-link>
      <gem-link path="/" hash="#article-2"><button>go #article-2</button></gem-link>
      <app-article id="article-1" style="display: block; margin-top: 100px;">article-1</app-article>
      <app-article id="article-2" style="display: block; margin-top: 100px;">article-2</app-article>
    `;
  }
}
customElements.define('app-root', App);

render(
  html`
    <app-root></app-root>
  `,
  document.body,
);
