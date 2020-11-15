import { GemElement, html, history, render } from '../../';
import { createHistoryParams, GemRouteElement } from '../../elements/route';
import '../../elements/link';

import '../elements/layout';

const routes = {
  home: {
    pattern: '/',
    get content() {
      return html`
        <style>
          gem-active-link {
            display: block;
          }
          gem-active-link:state(active) {
            color: inherit;
          }
          gem-active-link.active {
            color: inherit;
          }
        </style>
        current route: home page, click navigation to a page
        <gem-active-link .route=${routes.a} .options=${{ params: { b: 1 } }}>
          a page link, params: {a: 1}
        </gem-active-link>
      `;
    },
  },
  a: {
    pattern: '/a/:b',
    get content() {
      return html`
        <style>
          gem-active-link {
            display: block;
          }
          gem-active-link:state(active) {
            color: inherit;
          }
          gem-active-link.active {
            color: inherit;
          }
        </style>
        current route: /a/:b, click navigation to home page, cuurent query: ${history.getParams().query.toString()}
        <gem-active-link .route=${routes.a} .options=${{ params: { b: 1 }, query: '?a=1' }}>
          a page link, query: ?a=1
        </gem-active-link>
      `;
    },
  },
};

class App extends GemElement {
  onclick = () => {
    if (GemRouteElement.currentRoute === routes.home) {
      history.push(createHistoryParams(routes.a, { params: { b: String(Date.now()) } }));
    } else {
      history.push(createHistoryParams(routes.home));
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

render(
  html`
    <gem-examples-layout>
      <app-root slot="main"></app-root>
    </gem-examples-layout>
  `,
  document.body,
);
