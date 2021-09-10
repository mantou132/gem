import { GemElement, html, history, render } from '../../';
import { connectStore, customElement, RefObject, refobject } from '../../lib/decorators';
import { createHistoryParams, GemRouteElement, RoutesObject } from '../../elements/route';
import '../../elements/link';

import '../elements/layout';

const locationStore = GemRouteElement.createLocationStore();

@connectStore(locationStore)
@customElement('route-a')
export class RouteA extends GemElement {
  render = () => {
    return html`
      <style>
        gem-active-link {
          display: block;
        }
        gem-active-link:where(.--active, :--active) {
          color: inherit;
        }
      </style>
      current route: /a/:b, current params: ${JSON.stringify(locationStore.params)}, click navigation to home page,
      cuurent query: ${history.getParams().query.toString()}
      <gem-active-link .route=${routes.a} .options=${{ params: { b: 1 }, query: '?a=1' }}>
        a page link, query: ?a=1
      </gem-active-link>
    `;
  };
}

const routes: RoutesObject = {
  home: {
    pattern: '/',
    getContent(params) {
      return html`
        <style>
          gem-active-link {
            display: block;
          }
          gem-active-link:where(.--active, :--active) {
            color: inherit;
          }
        </style>
        current route: home page, current params: ${JSON.stringify(params)}, click navigation to /a page
        <gem-active-link .route=${routes.a} .options=${{ params: { b: 1 } }}>
          a page link, params: {a: 1}
        </gem-active-link>
      `;
    },
  },
  a: {
    pattern: '/a/:b',
    async getContent() {
      await new Promise((res) => setTimeout(res, 1000));
      return html`<route-a></route-a>`;
    },
  },
};
@customElement('app-root')
@connectStore(locationStore)
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
        <pre>${JSON.stringify(locationStore.params)}</pre>
        <gem-route
          ref=${this.routeRef.ref}
          @loading=${console.log}
          @change=${console.log}
          @error=${console.error}
          .routes=${routes}
          .locationStore=${locationStore}
        ></gem-route>
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
