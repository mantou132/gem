import { GemElement, html, ifDefined } from '../../lib/element';
import { attribute, property, state, part, connectStore } from '../../lib/decorators';
import { history, basePathStore } from '../../lib/history';
import { absoluteLocation } from '../../lib/utils';

import { matchPath, RouteItem, RouteOptions, createHistoryParams, createPath } from './route';

// 不包含 basePath
function getPathInfo(ele: GemLinkElement) {
  if (ele.route) {
    const queryProp = ele.options?.query || '';
    const hashProp = ele.options?.hash || '';
    return createPath(ele.route, ele.options) + queryProp + hashProp;
  } else {
    const url = ele.href || ele.path + ele.query + ele.hash;
    const { path, query } = history.getParams();
    if (url.startsWith('#')) {
      return `${path}${query}${url}`;
    } else if (url.startsWith('?')) {
      return `${path}${url}`;
    } else if (url.startsWith('.')) {
      return absoluteLocation(path, url);
    } else {
      return url;
    }
  }
}

function isExternal(pathInfo: string) {
  return !pathInfo.startsWith('/');
}

/**
 * @attr href
 * @attr target
 * @attr doc-title
 * @attr path
 * @attr query
 * @attr hash
 * @attr pattern
 * @attr hint
 * @part link
 *
 * print bug: https://github.com/mantou132/gem/issues/36
 */
@connectStore(basePathStore)
export class GemLinkElement extends GemElement {
  @attribute href: string;
  @attribute target: string;
  @attribute path: string;
  @attribute query: string;
  @attribute hash: string;
  @attribute docTitle: string;
  @attribute hint: 'on' | 'off';

  // 动态路由，根据 route.pattern 和 options.params 计算出 path
  @property route?: RouteItem;
  /**@deprecated */
  @property options?: RouteOptions;
  @property routeOptions?: RouteOptions;
  @property prepare?: () => void | Promise<void>;

  @part link: string;

  get #routeOptions() {
    return this.routeOptions || this.options;
  }

  constructor() {
    super();
    this.tabIndex = 0;
    this.addEventListener('click', this.#clickHandle);
  }

  #clickHandle = async () => {
    const pathInfo = getPathInfo(this);

    if (!pathInfo) return;

    // 外部链接使用 `window.open`
    if (isExternal(pathInfo)) {
      switch (this.target) {
        case '_self':
          window.location.href = pathInfo;
          return;
        case '_parent':
          window.parent.location.href = pathInfo;
          return;
        case '_top':
          window.top!.location.href = pathInfo;
          return;
        default:
          window.open(pathInfo);
          return;
      }
    }

    const { path, query, hash } = history.getParams();
    if (path + query + hash === pathInfo) {
      // 点击当前路由链接时，什么也没做
      return;
    }

    await this.prepare?.();

    if (this.route) {
      history.pushIgnoreCloseHandle({
        ...createHistoryParams(this.route, this.#routeOptions),
        title: this.route.title || this.docTitle,
      });
    } else if (this.href) {
      const { pathname, search, hash } = new URL(pathInfo, location.origin);
      history.pushIgnoreCloseHandle({
        path: pathname,
        query: search,
        hash: hash,
        title: this.docTitle,
      });
    } else {
      history.pushIgnoreCloseHandle({ path: this.path, query: this.query, hash: this.hash, title: this.docTitle });
    }
  };

  #preventDefault = (e: MouseEvent) => {
    e.preventDefault();
  };

  render(pathInfo = getPathInfo(this)) {
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
        a:visited {
          color: unset;
        }
      </style>
      <a
        part=${this.link}
        @click=${this.#preventDefault}
        href=${ifDefined(
          this.hint === 'off'
            ? undefined
            : isExternal(pathInfo)
              ? pathInfo
              : new URL(history.basePath + pathInfo, location.origin).toString(),
        )}
      >
        <slot></slot>
      </a>
    `;
  }
}

/**
 * @attr pattern
 * @state active
 */
@connectStore(history.store)
export class GemActiveLinkElement extends GemLinkElement {
  @attribute pattern: string; // 使用匹配模式设定 active
  @state active: boolean;

  render() {
    const { path, query, hash } = history.getParams();
    const isMatchPattern = this.pattern && matchPath(this.pattern, path);
    const pathInfo = getPathInfo(this);
    if (isMatchPattern || path + query + hash === pathInfo) {
      this.active = true;
    } else {
      this.active = false;
    }
    return super.render(pathInfo);
  }
}
