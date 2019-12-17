import { GemElement, html, history } from '../../';
import { createLocation, Route } from '../../elements/route';
import '../../elements/link';

const routes = {
  home: {
    pattern: '/',
    get content() {
      return html`
        <style>
          gem-link {
            display: block;
          }
          gem-link[active] {
            color: inherit;
          }
        </style>
        current route: home page, click navigation to a page
        <gem-link .route=${routes.a} .options=${{ params: { b: 1 } }}>a page link, params: {a: 1}</gem-link>
      `;
    },
  },
  a: {
    pattern: '/a/:b',
    get content() {
      return html`
        <style>
          gem-link {
            display: block;
          }
          gem-link[active] {
            color: inherit;
          }
        </style>
        current route: /a/:b, click navigation to home page
        <gem-link .route=${routes.a} .options=${{ params: { b: 1 }, query: '?a=1' }}>a page link, query: ?a=1</gem-link>
      `;
    },
  },
};

class App extends GemElement {
  onclick = () => {
    if (Route.currentRoute === routes.home) {
      history.push(createLocation(routes.a, { params: { b: String(Date.now()) } }));
    } else {
      history.push(createLocation(routes.home));
    }
  };
  render() {
    return html`
      <main>
        <gem-route .routes=${routes}></gem-route>
      </main>
    `;
  }
}
customElements.define('app-root', App);
document.body.append(new App());
