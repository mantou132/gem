import { GemElement, html, history } from '../../';
import { createRoute, Route } from '../../elements/route';

const routes = {
  home: {
    pattern: '/',
    content: html`
      current route: home page, click navigation to a page
    `,
  },
  a: {
    pattern: '/a/:b',
    content: html`
      current route: /a/:b, click navigation to home page
    `,
  },
};

class App extends GemElement {
  onclick = () => {
    if (Route.currentRoute === routes.home) {
      history.push(createRoute(routes.a, { params: { b: Date.now() } }));
    } else {
      history.push(createRoute(routes.home));
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
