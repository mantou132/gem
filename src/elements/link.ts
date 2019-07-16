import { GemElement, html, history } from '../';
import { RouteItem, RouteOptions, createRoute, createPath } from './route';

export class Link extends GemElement {
  /**@attr */ path: string;
  /**@attr */ query: string;
  static observedAttributes = ['path', 'query'];
  static observedStores = [history.historyState];

  // 动态路由，根据 route.pattern 和 options.params 计算出 path
  route: RouteItem;
  options: RouteOptions;
  static observedPropertys = ['route', 'options'];

  constructor() {
    super();
    this.onclick = this.clickHandle;
  }

  get active() {
    const { path, query } = history.location;
    if (this.route) {
      const queryProp = (this.options && this.options.query) || this.query;
      return path + query === createPath(this.route, this.options) + queryProp;
    } else {
      return path + query === this.path + this.query;
    }
  }

  clickHandle = (e: MouseEvent) => {
    if (!this.active) {
      e.stopPropagation();
      if (this.route) {
        history.pushWithoutCloseHandle(createRoute(this.route, this.options));
      } else {
        history.pushWithoutCloseHandle({ path: this.path, query: this.query });
      }
    }
  };

  render() {
    if (this.active) {
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
