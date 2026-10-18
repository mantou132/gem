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
import { isolate, isServer } from '@mantou/gem/lib/server';
import { waitServerElements } from '@mantou/gem-ssr/decorators';

import {
  cacheHistoryData,
  clientState,
  type ErrorData,
  getHistoryEntry,
  loadServerData,
  outletStore,
  setSSRData,
  setSSRError,
  ssrData,
  takeRouteError,
  takeSSRData,
  toJSONValue,
  toRouteError,
} from './data';
import { type Meta, updateMeta } from './meta';
import { getPageOptions, type Params } from './page';

import '@mantou/gem/elements/route';

type ElementModule = { default: CustomElementConstructor };

// 每个 layout 的子路由，key 是 layout 的标签名，根路由的 key 为空字符串
let outletRoutes: Record<string, RouteItem[]> = {};

// 错误页面的路由，也是没有匹配时的 404 页面，`handle`、`load` 等出错时渲染在出错的路由的位置
let errorPage: RouteItem<RouteInfo> | undefined;

// 服务端渲染的 `<gemkit-outlet>` 在定义时就会升级，所以在设置路由后再定义
export function setOutlets(routes: Record<string, RouteItem[]>, error?: RouteItem<RouteInfo>) {
  outletRoutes = routes;
  errorPage = error;
  defineElement('gemkit-outlet', GemkitOutletElement);
}

/** 页面和 layout 的标签名由文件路径生成，加载模块后定义默认导出的元素 */
function defineElement(tag: string, cls: CustomElementConstructor) {
  if (!customElements.get(tag)) customElements.define(tag, cls);
  return cls;
}

async function loadData(cls: CustomElementConstructor, tag: string, params: Params, hasServerModule?: boolean) {
  const { path } = history.getParams();
  const err = takeRouteError(path, tag);
  if (err) throw err;
  if (isServer) return runLoad(cls, tag, params, path, hasServerModule);
  // 前进后退时使用离开时的数据，不再执行 `load`
  const cached = getHistoryEntry()?.data;
  if (cached && tag in cached) return cached[tag];
  const key = history.currentKey;
  const data = await runLoad(cls, tag, params, path, hasServerModule);
  cacheHistoryData(key, tag, data);
  return data;
}

/** 执行 `load` 获取数据，水合时使用服务端渲染的数据 */
async function runLoad(
  cls: CustomElementConstructor,
  tag: string,
  params: Params,
  path: string,
  hasServerModule?: boolean,
) {
  const ssrResult = isServer ? undefined : takeSSRData(path, tag);
  if (ssrResult) return ssrResult.data;
  const { load } = getPageOptions(cls);
  if (!load && !hasServerModule) return;
  const serverData = hasServerModule ? await loadServerData(tag, params) : undefined;
  const data = load ? await load(params, serverData) : serverData;
  if (!isServer) return data;
  // 服务端模块的数据已经转换过
  const json = load ? toJSONValue(data) : data;
  setSSRData(path, tag, json);
  return json;
}

// layout 和页面的 meta，`path` 是加载时的页面路径，只合并当前路径的
const routeMeta = isolate<{ value: Record<string, { path: string; meta: Meta }> }>({ value: {} });

/** 当前路径匹配的 layout 和页面（或者错误页面）的 meta，内层的覆盖外层的 */
export function getRouteMeta(path: string) {
  const tags = matchRoutes(path).map(({ info }) => info.tag);
  if (errorPage) tags.push(errorPage.data!.tag);
  return Object.fromEntries(
    tags.flatMap((tag) => {
      const item = routeMeta.value[tag];
      return item?.path === path ? Object.entries(item.meta) : [];
    }),
  ) as Meta;
}

function deleteRouteMeta(tags: string[]) {
  routeMeta.value = Object.fromEntries(Object.entries(routeMeta.value).filter(([tag]) => !tags.includes(tag)));
}

/** 记录 layout 或页面的 meta，客户端更新 `<head>`，layout 和页面可能并行加载，所以都要更新 */
async function setRouteMeta(cls: CustomElementConstructor, tag: string, params: Params, data: unknown) {
  const { meta } = getPageOptions(cls);
  const { path } = history.getParams();
  const value = typeof meta === 'function' ? await meta(params, data) : meta;
  routeMeta.value = { ...routeMeta.value, [tag]: { path, meta: value || {} } };
  if (!isServer) updateMeta(getRouteMeta(path));
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
async function loadLayout(
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
  await setRouteMeta(cls, tag, params, data);
  return { params, data };
}

/**
 * 加载页面模块和数据，返回页面数据，`hasServerModule` 表示页面有 `*.server.ts`，
 * 错误页面使用 `error` 作为数据
 */
async function loadPage(
  load: () => Promise<ElementModule>,
  tag: string,
  params: Params,
  hasServerModule?: boolean,
  error?: ErrorData,
) {
  const cls = (await load()).default;
  const data = error || (await loadData(cls, tag, params, hasServerModule));
  // layout 在页面之前加载
  clientState.invalidated = false;
  defineElement(tag, cls);
  const { title: getTitle } = getPageOptions(cls);
  const title = typeof getTitle === 'function' ? await getTitle(params, data) : getTitle;
  if (title !== undefined) titleStore({ title });
  // 页面正常显示时，同一路径之前的错误页面的 meta 不再使用
  if (!error && errorPage) deleteRouteMeta([errorPage.data!.tag]);
  await setRouteMeta(cls, tag, params, data);
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

// 加载并渲染错误页面，不检查路由是否匹配，在其他路由的位置渲染时使用
const errorContents = new WeakMap<RouteItem, (params: Params, error: ErrorData) => Promise<TemplateResult>>();

/**
 * `tag` 的路由出错时在它的位置渲染错误页面，它和子路由的 meta 不再使用，
 * 没有错误页面时渲染失败，跳转不是错误，直接抛出
 */
const renderError = (tag: string, params: Params) => (err: unknown) => {
  const content = errorPage && errorContents.get(errorPage);
  if (!content) throw err;
  const { path } = history.getParams();
  const error = toRouteError(tag, err);
  if (isServer) setSSRError(path, error);
  const tags = matchRoutes(path).map(({ info }) => info.tag);
  deleteRouteMeta(tags.slice(tags.indexOf(tag)));
  return content(params, { status: error.status, message: error.message });
};

/** 创建页面路由，`render` 使用页面的标签名渲染 */
export function pageRoute(
  pattern: string,
  info: RouteInfo,
  render: (params: Params, data: unknown) => TemplateResult,
): RouteItem<RouteInfo> {
  return {
    pattern,
    data: info,
    getContent: (params) => {
      if (!isMatched(info)) return;
      return loadPage(info.load, info.tag, params, info.server)
        .then((data) => render(params, data))
        .catch(renderError(info.tag, params));
    },
  };
}

const NOT_FOUND: ErrorData = { status: 404, message: 'Not Found' };

/** 创建错误页面的路由，没有匹配的路由时渲染 404，`render` 使用页面的标签名渲染 */
export function errorRoute(info: RouteInfo, render: (params: Params, error: ErrorData) => TemplateResult) {
  const content = (params: Params, error: ErrorData) =>
    loadPage(info.load, info.tag, params, false, error).then(() => render(params, error));
  const route: RouteItem<RouteInfo> = {
    pattern: '*',
    data: info,
    getContent: (params) => {
      if (!isMatched(info)) return;
      return content(params, NOT_FOUND);
    },
  };
  errorContents.set(route, content);
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
      return loadLayout(info.load, info.tag, params, container, info.server).then(
        render,
        renderError(info.tag, params),
      );
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
  if (page && !page.info.layout && page.info !== errorPage?.data) return page;
}

/** 所有页面路由，不包括错误页面 */
export function getPageRoutes() {
  return (Object.values(outletRoutes).flat() as RouteItem<RouteInfo>[])
    .filter(({ data }) => data && !data.layout && data !== errorPage?.data)
    .map(({ pattern, data }) => ({ info: data!, pattern }));
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
class GemkitOutletElement extends GemElement {
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
      .scrollWait=${waitServerElements}
    ></gem-light-route>`;
}
