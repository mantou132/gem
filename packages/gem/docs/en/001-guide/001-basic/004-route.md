# Route

The URL can be changed using the [History API](https://developer.mozilla.org/en-US/docs/Web/API/History), Gem's `history` object maintains a `Store` of history: `history.store`, when using `history` to update the route, its `history.store` will be updated to update the elements connected to `history.store`.

```js
import { GemElement, html, history, customElement, connectStore } from '@mantou/gem';

@customElement('app-root')
@connectStore(history.store)
class App extends GemElement {
  render() {
    return html`${history.getParams().path}`;
  }
}
```

Gem built-in elements `<gem-route>` and `<gem-link>` work like this.

<gbp-sandpack dependencies="@mantou/gem">

```js index.js
const routes = {
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
};

@customElement('app-root')
class App extends GemElement {
  render() {
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

</gbp-sandpack>
