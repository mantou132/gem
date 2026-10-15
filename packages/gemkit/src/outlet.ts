import { adoptedStyle, css, GemElement, history, html, template, titleStore } from '@mantou/gem';
import type { RouteItem } from '@mantou/gem/elements/route';
import { isServer } from '@mantou/gem/lib/server';

import { loadServerData, setSSRData, ssrData, takeSSRData, toJSONValue } from './data';
import { getPageOptions, type Params, setPendingProps } from './page';

import '@mantou/gem/elements/route';

type ElementModule = { default: CustomElementConstructor };

// 每个 layout 的子路由，key 是 layout 的标签名，根路由的 key 为空字符串
let outletRoutes: Record<string, RouteItem[]> = {};

// 服务端渲染的 `<gemkit-outlet>` 在定义时就会升级，所以在设置路由后再定义
export function setOutlets(routes: Record<string, RouteItem[]>) {
  outletRoutes = routes;
  defineElement('gemkit-outlet', GemkitOutletElement);
}

/** 页面和 layout 的标签名由文件路径生成，加载模块后定义默认导出的元素 */
export function defineElement(tag: string, cls: CustomElementConstructor) {
  if (!customElements.get(tag)) customElements.define(tag, cls);
  return cls;
}

async function loadData(cls: CustomElementConstructor, tag: string, params: Params, hasServerModule?: boolean) {
  const { path } = history.getParams();
  // 水合时使用服务端渲染的数据，不再执行 `load`
  const ssrResult = isServer ? undefined : takeSSRData(path, tag);
  if (ssrResult) return ssrResult.data;
  const { load } = getPageOptions(cls);
  if (!load && !hasServerModule) return;
  const serverData = hasServerModule ? await loadServerData(tag, params) : undefined;
  const data = load ? await load(params, serverData) : serverData;
  if (!isServer) return data;
  const json = toJSONValue(data);
  setSSRData(path, tag, json);
  return json;
}

/** 子路由匹配的部分（`*`）不属于 layout 的参数 */
export const getLayoutParams = (params: Params) =>
  Object.fromEntries(Object.entries(params).filter(([key]) => !/^\d+$/.test(key)));

/**
 * 加载 layout 模块和数据，`container` 是路由的渲染容器，`hasServerModule` 表示有 `_layout.server.ts`
 *
 * 子路由间导航时 layout 已经渲染，参数不变就复用数据
 */
export async function loadLayout(
  load: () => Promise<ElementModule>,
  tag: string,
  routeParams: Params,
  container: Element | ShadowRoot,
  hasServerModule?: boolean,
) {
  const cls = (await load()).default;
  const params = getLayoutParams(routeParams);
  const current = [...container.children].find((e) => e.localName === tag) as { params?: Params; data?: unknown };
  const data =
    current && JSON.stringify(current.params) === JSON.stringify(params)
      ? current.data
      : await loadData(cls, tag, params, hasServerModule);
  setPendingProps({ params, data });
  defineElement(tag, cls);
  return { params, data };
}

/** 加载页面模块和数据，返回页面数据，`hasServerModule` 表示页面有 `*.server.ts` */
export async function loadPage(
  load: () => Promise<ElementModule>,
  tag: string,
  params: Params,
  hasServerModule?: boolean,
) {
  const cls = (await load()).default;
  const data = await loadData(cls, tag, params, hasServerModule);
  setPendingProps({ params, data });
  defineElement(tag, cls);
  const { title: getTitle } = getPageOptions(cls);
  const title = typeof getTitle === 'function' ? await getTitle(params, data) : getTitle;
  if (title !== undefined) titleStore({ title });
  if (isServer) ssrData.ready = true;
  return data;
}

const style = css`
  :scope,
  gem-light-route {
    display: contents;
  }
`;

/**
 * 在 layout 中渲染子路由
 */
@adoptedStyle(style)
export class GemkitOutletElement extends GemElement {
  // 向上查找所属的 layout，包括 ShadowDOM 的宿主
  get #routes() {
    let node: Node | null = this.parentNode;
    while (node) {
      if (node instanceof Element && node.localName in outletRoutes) return outletRoutes[node.localName];
      node = node instanceof ShadowRoot ? node.host : node.parentNode;
    }
    return outletRoutes[''];
  }

  @template()
  #content = () => html`<gem-light-route .routes=${this.#routes}></gem-light-route>`;
}
