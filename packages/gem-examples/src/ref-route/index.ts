import { history, render } from '@mantou/gem';
import type { RouteItem } from '@mantou/gem/elements/route';
import { createHistoryParams, GemRouteElement } from '@mantou/gem/elements/route';

const homeRoute: RouteItem = {
  pattern: '/',
  async getContent(params) {
    await new Promise((res) => setTimeout(res, 1000));
    return html`<route-home .params=${params}></route-home>`;
  },
};

const aRoute: RouteItem = {
  pattern: '/a/:b',
  async getContent() {
    await new Promise((res) => setTimeout(res, 1000));
    return html`<route-a></route-a>`;
  },
};

const routes = {
  home: homeRoute,
  a: aRoute,
};

const locationStore = GemRouteElement.createLocationStore();

const linkStyle = css`
  gem-active-link {
    display: block;
  }
  gem-active-link:state(active) {
    color: inherit;
  }
`;

@adoptedStyle(linkStyle)
@customElement('route-home')
export class RouteHome extends GemElement {
  params: Record<string, string>;

  @template()
  #render = () => {
    return html`
      current route: home page, current params: ${JSON.stringify(this.params)}, click navigation to /a page
      <gem-active-link @click=${(e: Event) => e.stopPropagation()} .route=${routes.a} .options=${{ params: { b: 1 } }}>
        a page link, params: {b: 1}
      </gem-active-link>
    `;
  };
}

@adoptedStyle(linkStyle)
@connectStore(locationStore)
@customElement('route-a')
export class RouteA extends GemElement {
  @template()
  #render = () => {
    return html`
      current route: /a/:b, current params: ${JSON.stringify(locationStore.params)}, click navigation to home page,
      current query: ${history.getParams().query.toString()}
      <gem-active-link
        @click=${(e: Event) => e.stopPropagation()}
        .route=${routes.a}
        .options=${{ params: { b: 1 }, query: '?a=1' }}
      >
        a page link, query: ?a=1
      </gem-active-link>
    `;
  };
}

@customElement('app-root')
@connectStore(locationStore)
export class App extends GemElement {
  #routeRef = createRef<GemRouteElement>();

  constructor() {
    super();
    this.addEventListener('click', this.#onClick);
  }

  #onClick = () => {
    if (this.#routeRef.value?.currentRoute === routes.home) {
      history.push(createHistoryParams(routes.a, { params: { b: String(Date.now()) } }));
    } else {
      history.push(createHistoryParams(routes.home));
    }
  };

  @template()
  #render = () => {
    return html`
      <main>
        <pre>${JSON.stringify(locationStore.params)}</pre>
        <gem-route
          ${this.#routeRef}
          @loading=${console.log}
          @routechange=${console.log}
          @error=${console.error}
          .routes=${routes}
          .locationStore=${locationStore}
        ></gem-route>
      </main>
    `;
  };
}

render(
  html`
    <gem-examples-layout>
      <app-root></app-root>
    </gem-examples-layout>
  `,
  document.body,
);
