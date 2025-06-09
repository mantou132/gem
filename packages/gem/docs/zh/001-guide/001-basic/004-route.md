# 路由

在传统的多页面应用程序中，浏览器会根据用户的请求加载不同的 HTML 页面。
使用 Gem 所有的页面内容都动态生成，路由用于管理这些视图的映射。

## 基本

使用 [History API](https://developer.mozilla.org/en-US/docs/Web/API/History) 可以改变 URL，
Gem 的 `history` 对象维护一个历史记录的 `Store`: `history.store`，使用 `history` 更新路由时，
其 `history.store` 将得到更新，进而更新连接 `history.store` 的元素。

```js
import { GemElement, html, history, customElement, connectStore } from '@mantou/gem';

@customElement('app-root')
@connectStore(history.store)
class App extends GemElement {
  render = () => {
    return html`${history.getParams().path}`;
  }
}
```

Gem 内置元素 `<gem-route>` 和 `<gem-link>` 就是这样工作。

## 例子

<gbp-sandpack dependencies="@mantou/gem">

```js index.js
import { routes } from './routes';

@customElement('app-root')
class App extends GemElement {
  render = () => {
    return html`
      <nav style="display: flex; gap: 1em">
        <gem-link .route=${routes.home}>Home</gem-link>
        <gem-link .route=${routes.page} .routeOptions=${{ params: { b: '1' } }}>About</gem-link>
      </nav>
      <main>
        <gem-route .routes=${routes}></gem-route>
      </main>
    `;
  }
}
```

```js routes.js
export const routes = {
  home: {
    pattern: '/',
    content: html`home page`,
  },
  page: {
    pattern: '/page/:b',
    async getContent(params) {
      await new Promise((res) => setTimeout(res, 1000));
      return html`about page: params ${params.b}`;
    },
  },
  notFound: {
    pattern: '*',
    content: 'Not Found',
  },
};
```

</gbp-sandpack>
