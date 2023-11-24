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
import { GemElement, html } from '@mantou/gem';
import '@mantou/gem/elements/link';
import '@mantou/gem/elements/route';

const routes = {
  home: {
    pattern: '/',
    getContent() {
      return html`home page`;
    },
  },
  a: {
    pattern: '/a/:b',
    getContent() {
      return html`about page`;
    },
  },
};

class App extends GemElement {
  render() {
    return html`
      <nav style="display: flex; gap: 1em">
        <gem-link path="/">Home</gem-link>
        <gem-link path="/a/1">About</gem-link>
      </nav>
      <main>
        <gem-route .routes=${routes}></gem-route>
      </main>
    `;
  }
}
customElements.define('app-root', App);
```

</gbp-sandpack>
