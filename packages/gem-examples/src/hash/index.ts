import { addListener, adoptedStyle, customElement, GemElement, mounted, render, shadow, template } from '@mantou/gem';

const articleStyle = css`
  :host {
    display: block;
    margin-top: 100px;
  }
  div {
    height: 1000px;
  }
`;

@adoptedStyle(articleStyle)
@customElement('app-article')
@shadow()
class _Article extends GemElement {
  #checkHash = () => {
    if (this.id === location.hash.substr(1)) {
      this.scrollIntoView();
    }
  };

  @mounted()
  #init = () => {
    // 在当前页面刷新浏览器会保留滚动位置
    // 开新窗口测试带 hash 链接
    this.#checkHash();
    return addListener(window, 'hashchange', this.#checkHash);
  };

  @template()
  #render = () => {
    return html`<div><slot></slot></div>`;
  };
}

@customElement('app-root')
class _App extends GemElement {
  @template()
  #render = () => {
    return html`
      <a href="#article-1">${'<a href="#article-1">'}</a>
      <a href="#article-2">${'<a href="#article-2">'}</a>
      <gem-link path="/" hash="#article-1"><button>go #article-1</button></gem-link>
      <gem-link path="/" hash="#article-2"><button>go #article-2</button></gem-link>
      <app-article id="article-1">article-1</app-article>
      <app-article id="article-2">article-2</app-article>
    `;
  };
}

render(
  html`
    <gem-examples-layout>
      <app-root></app-root>
    </gem-examples-layout>
  `,
  document.body,
);
