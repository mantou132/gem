import { adoptedStyle, boolattribute, css, GemElement, html, keyed, mounted, property, template } from '@mantou/gem';
import type { RouteItem } from '@mantou/gem/elements/base/route';
import { isServer } from '@mantou/gem/lib/server';
import { ssrContext } from '@mantou/gem-ssr/decorators';

import { addOutlet, defineElement, getCommittedRoutes, getLevel, loadServerRoutes } from './navigation';
import { getRender, isOwner, type RouteInfo, setRoutes } from './route';

// 服务端渲染的 `<gemkit-outlet>` 在定义时就会升级，所以在设置路由后再定义
export function setOutlets(routes: Record<string, RouteItem<RouteInfo>[]>, error?: RouteItem<RouteInfo>) {
  setRoutes(routes, error);
  defineElement('gemkit-outlet', GemkitOutletElement);
}

/** 祖先元素，包括 ShadowDOM 的宿主 */
function* ancestors(node: Node) {
  let current = node.parentNode;
  while (current) {
    if (current instanceof Element) yield current;
    current = current instanceof ShadowRoot ? current.host : current.parentNode;
  }
}

const style = css`
  :scope {
    display: contents;
  }
`;

/**
 * 在 layout 中渲染子路由
 *
 * 渲染已提交的导航中自己所在层级的路由；页面参数改变时（例如 `/blog/a` 到 `/blog/b`）重新创建页面元素，
 * 页面中的元素和状态都不复用，只有查询参数改变、提交表单或者 `invalidate()` 重新加载时复用页面元素
 */
@adoptedStyle(style)
class GemkitOutletElement extends GemElement {
  /** 页面的滚动容器，用来恢复或者重置滚动位置，默认使用外层 outlet 的，最外层默认为文档 */
  @property scrollContainer?: Element | (() => Element | null | undefined);
  /** 导航中这个 outlet 的内容重新渲染时，整个提交使用一个视图过渡 */
  @boolattribute transition: boolean;

  // 服务端渲染时等待路由加载并提交后，渲染并输出内容
  #wait = isServer && ssrContext.waits.set(this, loadServerRoutes().then(this.update));

  #ownerTag?: string;

  // 所在的 layout 的标签名，根路由为空字符串
  get #owner() {
    this.#ownerTag ??= [...ancestors(this)].find((element) => isOwner(element.localName))?.localName ?? '';
    return this.#ownerTag;
  }

  get #scrollContainer(): Element | null | undefined {
    const { scrollContainer } = this;
    if (scrollContainer) return typeof scrollContainer === 'function' ? scrollContainer() : scrollContainer;
    for (const node of ancestors(this)) {
      if (node instanceof GemkitOutletElement) return node.#scrollContainer;
    }
    return document.scrollingElement;
  }

  @mounted()
  #register = () => {
    const outlet = this;
    return addOutlet({
      owner: this.#owner,
      get transition() {
        return outlet.transition;
      },
      getScrollContainer: () => this.#scrollContainer,
      update: this.update,
    });
  };

  // 还没有提交（水合前）或者所在的 layout 即将被移除时保持原来的内容；
  // 服务端不渲染的路由输出空的 outlet，没有匹配的子路由（没有错误页面）时为空
  @template()
  #content = () => {
    const routes = getCommittedRoutes();
    const level = getLevel(this.#owner, routes);
    if (!routes.length || level === -1) return;
    const route = routes[level];
    if (!route) return isServer ? undefined : html``;
    const { info, params, data } = route;
    const key = info.layout ? info.tag : info.tag + JSON.stringify(params);
    return html`${keyed(key, getRender(info)(params, data))}`;
  };
}
