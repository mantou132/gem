import { GemElement, render, html } from '../../';
import '../../elements/link';

class Article extends GemElement {
  constructor() {
    super();
    window.addEventListener('hashchange', this.checkHash);
  }

  mounted = () => {
    // 在当前页面刷新浏览器会保留滚动位置
    // 开新窗口测试带 hash 链接
    this.checkHash();
  };

  unmounted = () => {
    window.removeEventListener('hashchange', this.checkHash);
  };

  checkHash = () => {
    if (this.id === location.hash.substr(1)) {
      this.scrollIntoView();
    }
  };

  render() {
    return html`<div style="height: 1000px"><slot></slot></div>`;
  }
}
customElements.define('app-article', Article);

class App extends GemElement {
  render() {
    return html`
      <a href="#article-1">${'<a href="#article-1">'}</a>
      <a href="#article-2">${'<a href="#article-2">'}</a>
      <gem-link path="/" hash="#article-1"><button>go #article-1</button></gem-link>
      <gem-link path="/" hash="#article-2"><button>go #article-2</button></gem-link>
      <app-article id="article-1" style="display: block; margin-top: 100px;">article-1</app-article>
      <app-article id="article-2" style="display: block; margin-top: 100px;">article-2</app-article>
    `;
  }
}
customElements.define('app-root', App);

render(html`<app-root></app-root>`, document.body);
