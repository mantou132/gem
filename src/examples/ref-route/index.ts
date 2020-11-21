import { GemElement, html, history, render } from '../../';
import { customElement, RefObject, refobject } from '../../lib/decorators';
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

@customElement('app-root')
export class App extends GemElement {
  @refobject routeRef: RefObject<GemRouteElement>;
  onclick = () => {
    if (this.routeRef.element?.currentRoute === routes.home) {
      history.push(createHistoryParams(routes.a, { params: { b: String(Date.now()) } }));
    } else {
      history.push(createHistoryParams(routes.home));
    }
  };
  render() {
    return html`
      <main>
        <gem-route ref=${this.routeRef.ref} .routes=${routes}></gem-route>
      </main>
    `;
  }
}

render(
  html`
    <gem-examples-layout>
      <app-root slot="main"></app-root>
    </gem-examples-layout>
  `,
  document.body,
);
