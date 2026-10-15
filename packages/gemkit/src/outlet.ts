import { adoptedStyle, css, GemElement, history, html, template, titleStore } from '@mantou/gem';
import type { RouteItem } from '@mantou/gem/elements/route';
import { isServer } from '@mantou/gem/lib/server';

import { loadServerData, ssrData, takeSSRData, toJSONValue } from './data';
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

export async function loadLayout(load: () => Promise<ElementModule>, tag: string) {
  defineElement(tag, (await load()).default);
}

/** 加载页面模块和数据，返回页面数据，`hasServerModule` 表示页面有 `*.server.ts` */
export async function loadPage(
  load: () => Promise<ElementModule>,
  tag: string,
  params: Params,
  hasServerModule?: boolean,
) {
  const cls = (await load()).default;
  const options = getPageOptions(cls);
  const { path } = history.getParams();
  // 水合时使用服务端渲染的数据，不再执行 `load`
  const ssrResult = isServer ? undefined : takeSSRData(path);
  let data = ssrResult?.data;
  if (!ssrResult) {
    const serverData = hasServerModule ? await loadServerData(tag, params) : undefined;
    data = options.load ? await options.load(params, serverData) : serverData;
  }
  if (isServer) {
    data = toJSONValue(data);
    ssrData.current = { path, data };
  }
  setPendingProps({ params, data });
  defineElement(tag, cls);
  const title = typeof options.title === 'function' ? await options.title(params, data) : options.title;
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
