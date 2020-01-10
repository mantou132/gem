import { GemElement, html, history, attribute, property, connectStore, customElement } from '../';
import { isMatch, RouteItem, RouteOptions, createLocation, createPath } from './route';

/**
 * @attr href
 * @attr path
 * @attr query
 * @attr hash
 * @attr pattern
 * @state active
 */
@customElement('gem-link')
@connectStore(history.store) // TODO
export class Link extends GemElement {
  @attribute href: string;
  @attribute path: string;
  @attribute query: string;
  @attribute hash: string;
  @attribute pattern: string; // 使用匹配模式设定 active

  // 动态路由，根据 route.pattern 和 options.params 计算出 path
  @property route: RouteItem;
  @property options: RouteOptions;

  constructor() {
    super();
    this.onclick = this.clickHandle;
  }

  getHref() {
    if (this.route) {
      const queryProp = this.options ? this.options.query || '' : '';
      const hashProp = this.options ? this.options.hash || '' : '';
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

    const { path, query, hash } = history.getParams();
    if (path + query + hash === href) {
      return;
    }

    e.stopPropagation();
    if (this.route) {
      history.pushIgnoreCloseHandle(createLocation(this.route, this.options));
    } else {
      history.pushIgnoreCloseHandle({ path: this.path, query: this.query, hash: this.hash });
    }
  };

  preventDefault = (e: MouseEvent) => {
    e.preventDefault();
  };

  render() {
    const { path, query, hash } = history.getParams();
    const isMatchPattern = this.pattern && isMatch(this.pattern, path);
    const href = this.getHref();
    if (isMatchPattern || path + query + hash === href) {
      this.setAttribute('active', '');
    } else {
      this.removeAttribute('active');
    }

    return html`
      <style>
        :host {
          /* link default style */
          cursor: pointer;
          color: blue;
          text-decoration: underline;
        }
        a {
          all: unset;
        }
      </style>
      <a @click=${this.preventDefault} href=${new URL(href, location.origin).toString()}>
        <slot></slot>
      </a>
    `;
  }
}
