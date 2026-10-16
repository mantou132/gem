import {
  adoptedStyle,
  connectStore,
  createRef,
  css,
  GemElement,
  history,
  html,
  type TemplateResult,
  template,
  titleStore,
} from '@mantou/gem';
import { type GemLightRouteElement, matchPath, type RouteItem } from '@mantou/gem/elements/route';
import { isServer } from '@mantou/gem/lib/server';

import {
  clientState,
  loadServerData,
  NotFound,
  outletStore,
  setSSRData,
  setSSRNotFound,
  ssrData,
  takeSSRData,
  toJSONValue,
} from './data';
import { getPageOptions, type Params } from './page';

import '@mantou/gem/elements/route';

type ElementModule = { default: CustomElementConstructor };

// 每个 layout 的子路由，key 是 layout 的标签名，根路由的 key 为空字符串
let outletRoutes: Record<string, RouteItem[]> = {};

// 404 页面的路由，`load` 中调用 `notFound()` 时渲染
let notFoundRoute: RouteItem<RouteInfo> | undefined;

// 服务端渲染的 `<gemkit-outlet>` 在定义时就会升级，所以在设置路由后再定义
export function setOutlets(routes: Record<string, RouteItem[]>, notFound?: RouteItem<RouteInfo>) {
  outletRoutes = routes;
  notFoundRoute = notFound;
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
  let data: unknown;
  try {
    const serverData = hasServerModule ? await loadServerData(tag, params) : undefined;
    data = load ? await load(params, serverData) : serverData;
  } catch (err) {
    if (isServer && err instanceof NotFound) setSSRNotFound(path, tag);
    throw err;
  }
  if (!isServer) return data;
  // 服务端模块的数据已经转换过
  const json = load ? toJSONValue(data) : data;
  setSSRData(path, tag, json);
  return json;
}

/** 子路由匹配的部分（`*`）不属于 layout 的参数 */
export const getLayoutParams = (params: Params) =>
  Object.fromEntries(Object.entries(params).filter(([key]) => !/^\d+$/.test(key)));

/** 子路由间导航时 layout 参数不变就复用数据，提交表单后重新加载，`prev` 和 `next` 是 layout 的参数 */
export const canReuseLayoutData = (prev: Params | undefined, next: Params) =>
  !!prev && !clientState.invalidated && JSON.stringify(prev) === JSON.stringify(next);

/**
 * 加载 layout 模块和数据，`container` 是路由的渲染容器，`hasServerModule` 表示有 `_layout.server.ts`
 *
 * 子路由间导航时 layout 已经渲染，参数不变就复用数据，提交表单后重新加载
 */
export async function loadLayout(
  load: () => Promise<ElementModule>,
  tag: string,
  routeParams: Params,
  container: ParentNode,
  hasServerModule?: boolean,
) {
  const cls = (await load()).default;
  const params = getLayoutParams(routeParams);
  const current = [...container.children].find((e) => e.localName === tag) as { params?: Params; data?: unknown };
  const data = canReuseLayoutData(current?.params, params)
    ? current!.data
    : await loadData(cls, tag, params, hasServerModule);
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
  // layout 在页面之前加载
  clientState.invalidated = false;
  defineElement(tag, cls);
  const { title: getTitle } = getPageOptions(cls);
  const title = typeof getTitle === 'function' ? await getTitle(params, data) : getTitle;
  if (title !== undefined) titleStore({ title });
  if (isServer) ssrData.ready = true;
  return data;
}

/** 生成的路由的信息，链接预取时使用 */
export interface RouteInfo {
  tag: string;
  load: () => Promise<ElementModule>;
  /** 有 `*.server.ts` */
  server?: boolean;
  layout?: boolean;
}

/**
 * 导航到 layout 外时，即将移除的 layout 中的 outlet 也会响应路由变化，
 * 它会匹配到不在当前路径上的路由（通常是 404 页面），不应该加载它，否则会覆盖标题
 */
const isMatched = ({ tag }: RouteInfo) => matchRoutes(history.getParams().path).some(({ info }) => info.tag === tag);

// 加载并渲染路由的内容，不检查路由是否匹配，404 页面在其他路由中渲染时使用
const routeContents = new WeakMap<RouteItem, (params: Params) => Promise<TemplateResult>>();

/** `load` 中调用了 `notFound()` 时渲染 404 页面，没有 404 页面时渲染失败 */
const renderNotFound = (params: Params) => (err: unknown) => {
  const content = notFoundRoute && routeContents.get(notFoundRoute);
  if (!(err instanceof NotFound) || !content) throw err;
  return content(params);
};

/** 创建页面路由，`render` 使用页面的标签名渲染 */
export function pageRoute(
  pattern: string,
  info: RouteInfo,
  render: (params: Params, data: unknown) => TemplateResult,
): RouteItem<RouteInfo> {
  const content = (params: Params) =>
    loadPage(info.load, info.tag, params, info.server).then((data) => render(params, data));
  const route: RouteItem<RouteInfo> = {
    pattern,
    data: info,
    getContent: (params) => {
      if (!isMatched(info)) return;
      return content(params).catch(renderNotFound(params));
    },
  };
  routeContents.set(route, content);
  return route;
}

/** 创建 layout 路由，`render` 使用 layout 的标签名渲染 */
export function layoutRoute(
  pattern: string,
  info: RouteInfo,
  render: (props: { params: Params; data: unknown }) => TemplateResult,
): RouteItem<RouteInfo> {
  return {
    pattern,
    data: { ...info, layout: true },
    getContent: (params, container) => {
      if (!isMatched(info)) return;
      return loadLayout(info.load, info.tag, params, container, info.server).then(render, renderNotFound(params));
    },
  };
}

/** 路径匹配的 layout 和页面，和路由一样从根路由逐层匹配 */
export function matchRoutes(path: string) {
  const result: { info: RouteInfo; params: Params }[] = [];
  let routes: RouteItem[] | undefined = outletRoutes[''];
  while (routes) {
    let params: Params | null = null;
    const route = routes.find(({ pattern }) => (params = matchPath(pattern, path)));
    const info = route?.data as RouteInfo | undefined;
    if (!info || !params) break;
    result.push({ info, params });
    routes = info.layout ? outletRoutes[info.tag] : undefined;
  }
  return result;
}

/** 路径匹配的页面，没有匹配时（渲染 404 页面）返回 `undefined` */
export function matchPage(path: string) {
  const page = matchRoutes(path).at(-1);
  if (page && !page.info.layout && page.info !== notFoundRoute?.data) return page;
}

/** 所有页面路由，不包括 404 页面 */
export function getPageRoutes() {
  const result = new Map<RouteInfo, string>();
  for (const routes of Object.values(outletRoutes)) {
    for (const { pattern, data } of routes as RouteItem<RouteInfo>[]) {
      if (data && !data.layout && data !== notFoundRoute?.data) result.set(data, pattern);
    }
  }
  return [...result].map(([info, pattern]) => ({ info, pattern }));
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
@connectStore(outletStore)
@connectStore(history.store)
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

  // 路由只在路径改变时更新，查询参数改变时也需要重新加载页面数据，只改变 hash 时不加载
  get #key() {
    return `${outletStore.key}${history.getParams().query}`;
  }

  #routeRef = createRef<GemLightRouteElement>();

  // 页面渲染后恢复或者重置窗口的滚动位置，layout 渲染后页面还没有加载
  #getScrollContainer = () => {
    const info = this.#routeRef.value?.currentRoute?.data as RouteInfo | undefined;
    return info?.layout ? null : document.scrollingElement;
  };

  // 不在 outlet 中输出空白文本
  @template()
  #content = () =>
    html`<gem-light-route
      ${this.#routeRef}
      .key=${this.#key}
      .routes=${this.#routes}
      .scrollContainer=${this.#getScrollContainer}
    ></gem-light-route>`;
}
