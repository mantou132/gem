# 路由

使用 [History API](https://developer.mozilla.org/en-US/docs/Web/API/History) 可以改变 URL，
Gem 的 `history` 对象维护一个历史记录的 Store: `history.store`，使用 `history` 更新路由时，
其 `history.store` 将得到更新，进而更新连接 `history.store` 的元素。

Gem 内置元素 `<gem-route>` 和 `<gem-link>` 就是这样工作。

```js
import { GemElement, html } from '@mantou/gem';
import '@mantou/gem/elements/link';
import '@mantou/gem/elements/route';

const routes = {
  home: {
    pattern: '/',
    get content() {
      return html`
        home page
      `;
    },
  },
  a: {
    pattern: '/a/:b',
    get content() {
      return html`
        a page
      `;
    },
  },
};

class App extends GemElement {
  render() {
    return html`
      <nav>
        <gem-link path="/">home</gem-link>
        <gem-link path="/a/1">a</gem-link>
      </nav>
      <main>
        <gem-route .routes=${routes}></gem-route>
      </main>
    `;
  }
}
customElements.define('app-root', App);

document.body.append(new App());
```

[![Edit gem-route](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/gem-route-llky3?fontsize=14&hidenavigation=1&theme=dark)
