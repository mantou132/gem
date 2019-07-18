import { GemElement, html, history } from '../';
import { RouteItem, RouteOptions, createLocation, createPath } from './route';

export class Link extends GemElement {
  /**@attr */ href: string;
  /**@attr */ path: string;
  /**@attr */ query: string;
  /**@attr */ hash: string;
  static observedAttributes = ['href', 'path', 'query', 'hash'];
  static observedStores = [history.historyState];

  // 动态路由，根据 route.pattern 和 options.params 计算出 path
  route: RouteItem;
  options: RouteOptions;
  static observedPropertys = ['route', 'options'];

  constructor() {
    super();
    this.onclick = this.clickHandle;
  }

  getHref() {
    if (this.route) {
      const queryProp = this.options ? this.options.query : '';
      const hashProp = this.options ? this.options.hash : '';
      return createPath(this.route, this.options) + queryProp + hashProp;
    } else {
      return this.href || this.path + this.query + this.hash;
    }
  }

  clickHandle = (e: MouseEvent) => {
    const href = this.getHref();
    if (!href.startsWith('/')) {
      window.open(href);
      return;
    }

    const { path, query, hash } = history.location;
    if (path + query + hash === href) {
      return;
    }

    e.stopPropagation();
    if (this.route) {
      history.pushWithoutCloseHandle(createLocation(this.route, this.options));
    } else {
      history.pushWithoutCloseHandle({ path: this.path, query: this.query, hash: this.hash });
    }
  };

  render() {
    const href = this.getHref();
    const { path, query, hash } = history.location;
    if (path + query + hash === href) {
      this.setAttribute('active', '');
    } else {
      this.removeAttribute('active');
    }

    return html`
      <slot></slot>
    `;
  }
}

customElements.define('gem-link', Link);
