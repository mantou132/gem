import { GemElement, html, history, basePathStore, attribute, property, connectStore, customElement, state } from '../';
import { isMatch, RouteItem, RouteOptions, createHistoryParams, createPath } from './route';

/**
 * @customElement gem-link
 * @attr href
 * @attr doc-title
 * @attr path
 * @attr query
 * @attr hash
 * @attr pattern
 */
@customElement('gem-link')
@connectStore(basePathStore)
export class Link extends GemElement {
  @attribute href: string;
  @attribute path: string;
  @attribute query: string;
  @attribute hash: string;
  @attribute docTitle: string;

  // 动态路由，根据 route.pattern 和 options.params 计算出 path
  @property route: RouteItem;
  @property options: RouteOptions;

  constructor() {
    super();
    this.onclick = this.clickHandle;
  }

  // 不包含 basePath
  // 不支持相对路径
  getHref() {
    if (this.route) {
      const queryProp = (this.options && this.options.query) || '';
      const hashProp = (this.options && this.options.hash) || '';
      return createPath(this.route, this.options) + queryProp + hashProp;
    } else {
      const url = this.href || this.path + this.query + this.hash;
      const { path, query } = history.getParams();
      if (url.startsWith('#')) {
        return `${path}${query}${url}`;
      } else if (url.startsWith('?')) {
        return `${path}${url}`;
      } else {
        return url;
      }
    }
  }

  clickHandle = (e: MouseEvent) => {
    const href = this.getHref();

    // 外部链接使用 `window.open`
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
      history.pushIgnoreCloseHandle({
        ...createHistoryParams(this.route, this.options),
        title: this.route.title || this.docTitle,
      });
    } else if (this.href) {
      const { pathname, search, hash } = new URL(href, location.origin);
      history.pushIgnoreCloseHandle({
        path: pathname,
        query: search,
        // 解码，方便 `<gem-active-link>` CJK hash 比较
        hash: decodeURIComponent(hash),
        title: this.docTitle,
      });
    } else {
      history.pushIgnoreCloseHandle({ path: this.path, query: this.query, hash: this.hash, title: this.docTitle });
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
          display: contents;
        }
      </style>
      <a @click=${this.preventDefault} href=${new URL(history.basePath + href, location.origin).toString()}>
        <slot></slot>
      </a>
    `;
  }
}

/**
 * @customElement gem-active-link
 * @attr pattern
 * @state active
 */
@customElement('gem-active-link')
@connectStore(history.store)
export class ActiveLink extends Link {
  @attribute pattern: string; // 使用匹配模式设定 active
  @state active: boolean;

  render() {
    const { path, query, hash } = history.getParams();
    const isMatchPattern = this.pattern && isMatch(this.pattern, path);
    const href = this.getHref();
    if (isMatchPattern || path + query + hash === href) {
      this.active = true;
      this.classList.add('active'); // internals 支持 states 再删除
    } else {
      this.active = false;
      this.classList.remove('active');
    }
    return super.render(href);
  }
}
