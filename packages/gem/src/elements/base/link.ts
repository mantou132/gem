import { css, GemElement, html } from '../../lib/element';
import {
  attribute,
  property,
  state,
  part,
  connectStore,
  shadow,
  aria,
  adoptedStyle,
  mounted,
  effect,
  boolattribute,
  template,
} from '../../lib/decorators';
import { history, basePathStore } from '../../lib/history';
import { absoluteLocation } from '../../lib/utils';

import type { RouteItem, RouteOptions } from './route';
import { matchPath, createHistoryParams, createPath } from './route';

function isExternal(path: string) {
  return !path.startsWith('/');
}

const styles = css`
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
`;

/**
 * Bug: print `<link>` https://github.com/mantou132/gem/issues/36
 */
@connectStore(basePathStore)
@adoptedStyle(styles)
@shadow()
@aria({ focusable: true })
export class GemLinkElement extends GemElement {
  @attribute href: string;
  @attribute target: string;
  @attribute path: string;
  @attribute query: string;
  @attribute hash: string;
  @attribute hint: 'on' | 'off';
  /** Preload route content when point over */
  @boolattribute preload: boolean;

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

  get #hint() {
    return this.hint || 'on';
  }

  #onClick = async () => {
    const locationString = this._getLocationString();

    if (!locationString) return;

    // 外部链接使用 `window.open`
    if (isExternal(locationString)) {
      switch (this.target) {
        case '_self':
          window.location.href = locationString;
          return;
        case '_parent':
          window.parent.location.href = locationString;
          return;
        case '_top':
          window.top!.location.href = locationString;
          return;
        default:
          window.open(locationString);
          return;
      }
    }

    const { path, query, hash } = history.getParams();
    if (path + query + hash === locationString) {
      // 点击当前路由链接时，什么也没做
      return;
    }

    await this.prepare?.();

    if (this.route) {
      history.pushIgnoreCloseHandle(createHistoryParams(this.route, this.#routeOptions));
    } else if (this.href) {
      const url = new URL(locationString, location.origin);
      history.pushIgnoreCloseHandle({
        path: url.pathname,
        query: url.search,
        hash: url.hash,
      });
    } else {
      history.pushIgnoreCloseHandle({
        path: this.path,
        query: this.query,
        hash: this.hash,
      });
    }
  };

  #preventDefault = (e: MouseEvent) => e.preventDefault();

  #getHint = () => {
    const locationString = this._getLocationString();
    return isExternal(locationString)
      ? locationString
      : new URL(history.basePath + locationString, location.origin).toString();
  };

  #preload = () => {
    // 也许是 `getter`
    this.route?.content;
    // 只触发 `getContent` 调用，参数不使用
    this.route?.getContent?.({}, this.shadowRoot!);
  };

  @mounted()
  #init() {
    this.addEventListener('click', this.#onClick);
    this.addEventListener('pointerenter', this.#preload);
  }

  @template()
  #content = () => {
    return html`
      <a
        part=${this.link}
        @click=${this.#preventDefault}
        href=${this.#hint === 'off' ? null : this.#getHint()}
        tabindex="-1"
      >
        <slot></slot>
      </a>
    `;
  };

  /**
   * 如果该元素是外部链接返回 URL，否则返回路径（不包含 basePath）
   */
  _getLocationString() {
    if (this.route) {
      const queryProp = this.#routeOptions?.query || '';
      const hashProp = this.#routeOptions?.hash || '';
      return createPath(this.route, this.#routeOptions) + queryProp + hashProp;
    } else {
      const url = this.href || this.path + this.query + this.hash;
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
}

@connectStore(history.store)
export class GemActiveLinkElement extends GemLinkElement {
  @attribute pattern: string; // 使用匹配模式设定 active
  @state active: boolean;

  @effect()
  #updateState = () => {
    const { path, query, hash } = history.getParams();
    const isMatchPattern = this.pattern && matchPath(this.pattern, path);
    this.active = !!isMatchPattern || path + query + hash === this._getLocationString();
  };
}
