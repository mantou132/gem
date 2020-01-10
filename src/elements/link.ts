import { GemElement, html, history, basePathStore, attribute, property, connectStore, customElement } from '../';
import { isMatch, RouteItem, RouteOptions, createHistoryParams, createPath } from './route';

/**
 * @attr href
 * @attr path
 * @attr query
 * @attr hash
 * @attr pattern
 * @state active
 */
@customElement('gem-link')
@connectStore(basePathStore)
export class Link extends GemElement {
  @attribute href: string;
  @attribute path: string;
  @attribute query: string;
  @attribute hash: string;

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
      history.pushIgnoreCloseHandle(createHistoryParams(this.route, this.options));
    } else if (this.href) {
      const { pathname, search, hash } = new URL(this.href, location.origin);
      history.pushIgnoreCloseHandle({ path: pathname, query: search, hash });
    } else {
      console.log(this.href);
      history.pushIgnoreCloseHandle({ path: this.path, query: this.query, hash: this.hash });
    }
  };

  preventDefault = (e: MouseEvent) => {
    e.preventDefault();
  };

  render(href = this.getHref()) {
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
      <a @click=${this.preventDefault} href=${new URL(history.basePath + href, location.origin).toString()}>
        <slot></slot>
      </a>
    `;
  }
}

/**
 * @attr pattern
 */
@customElement('gem-active-link')
@connectStore(history.store)
export class ActiveLink extends Link {
  @attribute pattern: string; // 使用匹配模式设定 active
  render() {
    const { path, query, hash } = history.getParams();
    const isMatchPattern = this.pattern && isMatch(this.pattern, path);
    const href = this.getHref();
    if (isMatchPattern || path + query + hash === href) {
      this.setAttribute('active', '');
    } else {
      this.removeAttribute('active');
    }
    return super.render(href);
  }
}
