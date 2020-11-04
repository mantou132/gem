# Route

The URL can be changed using the [History API](https://developer.mozilla.org/en-US/docs/Web/API/History), Gem's `history` object maintains a store of history: `history.store`, when using `history` to update the route, its `history.store` will be updated to update the elements connected to `history.store`.

Gem built-in elements `<gem-route>` and `<gem-link>` work like this.

```js
import { GemElement, html } from '@mantou/gem';
import '@mantou/gem/elements/link';
import '@mantou/gem/elements/route';

const routes = {
  home: {
    pattern: '/',
    get content() {
      return html`home page`;
    },
  },
  a: {
    pattern: '/a/:b',
    get content() {
      return html`a page`;
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
