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
  unmounted,
} from '@mantou/gem';
import { type GemLightRouteElement, matchPath, type RouteItem } from '@mantou/gem/elements/route';
import { isolate, isServer } from '@mantou/gem/lib/server';
import { waitServerElements } from '@mantou/gem-ssr/decorators';

import {
  cacheHistoryData,
  clientState,
  type ErrorData,
  getHistoryEntry,
  isOutdated,
  loadServerData,
  navigationStore,
  outletStore,
  Redirect,
  reload,
  runServerLoad,
  setSSRData,
  setSSRError,
  setSSRReady,
  settleNavigation,
  takeRouteError,
  takeSSRData,
  toRouteError,
} from './data';
import { type Meta, updateMeta } from './meta';
import { getPageOptions, type Params } from './page';

import '@mantou/gem/elements/route';

type ElementModule = { default: CustomElementConstructor };

// 应用的 i18n，加载模块后等待模块中创建的子模块加载语言包
let i18n: { ready: Promise<unknown> } | undefined;

/** 设置应用的 i18n，加载 layout 和页面模块后等待语言包加载完成再渲染 */
export function setI18n(value: typeof i18n) {
  i18n = value;
}

// 服务端渲染时加载的 layout 和页面（包括错误页面），以及由客户端渲染的路由，水合时客户端会加载它们的模块
const ssrRoutes = isolate<{ tags: string[] }>({ tags: [] });

/** 当前请求中客户端需要加载的 layout 和页面的标签名，文档中预加载它们的 chunk */
export const getSSRRoutes = () => ssrRoutes.tags;

/**
 * 加载 layout 或页面模块，等待模块中的 i18n 子模块加载当前语言包；
 * 导航时 chunk 加载失败通常是重新部署删除了旧的 chunk，重新加载页面；
 * 首次加载时是部署本身的问题，离线时是网络的问题，重新加载也会失败，渲染错误页面
 */
async function loadModule(load: () => Promise<ElementModule>, tag: string) {
  if (isServer) ssrRoutes.tags = [...ssrRoutes.tags, tag];
  let mod: ElementModule;
  try {
    mod = await load();
  } catch (err) {
    if (clientState.navigated && navigator.onLine && isOutdated(err)) return reload();
    throw err;
  }
  await i18n?.ready;
  return mod.default;
}

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

async function loadData(cls: CustomElementConstructor, tag: string, params: Params, serverLoad?: boolean) {
  const { path } = history.getParams();
  const err = takeRouteError(path, tag);
  if (err) throw err;
  if (isServer) return runLoad(cls, tag, params, path, serverLoad);
  // 前进后退时使用离开时的数据，不再执行 `load`
  const cached = getHistoryEntry()?.data;
  if (cached && tag in cached) return cached[tag];
  const key = history.currentKey;
  const data = await runLoad(cls, tag, params, path, serverLoad);
  cacheHistoryData(key, tag, data);
  return data;
}

/** 执行 `load` 获取数据，水合时使用服务端渲染的数据 */
async function runLoad(cls: CustomElementConstructor, tag: string, params: Params, path: string, serverLoad?: boolean) {
  const ssrResult = isServer ? undefined : takeSSRData(path, tag);
  if (ssrResult) return ssrResult.data;
  const { load } = getPageOptions(cls);
  if (!load && !serverLoad) return;
  const serverData = serverLoad ? await loadServerData(tag, params) : undefined;
  const data = load ? await load({ params, data: serverData }) : serverData;
  // 服务端模块的数据已经转换过
  return setSSRData(path, tag, data, !load);
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
  const value = typeof meta === 'function' ? await meta({ params, data }) : meta;
  routeMeta.value = { ...routeMeta.value, [tag]: { path, meta: value || {} } };
  if (!isServer) updateMeta(getRouteMeta(path));
}

/** 子路由匹配的部分（`*`）不属于 layout 的参数 */
export const getLayoutParams = (params: Params) =>
  Object.fromEntries(Object.entries(params).filter(([key]) => !/^\d+$/.test(key)));

/** 子路由间导航时 layout 参数不变就复用数据，提交表单或 `invalidate()` 后重新加载，`prev` 和 `next` 是 layout 的参数 */
export const canReuseLayoutData = (prev: Params | undefined, next: Params) =>
  !!prev && !clientState.invalidated && JSON.stringify(prev) === JSON.stringify(next);

/**
 * 加载 layout 模块和数据，`container` 是路由的渲染容器，`serverLoad` 表示 `_layout.server.ts` 有 `load`
 *
 * 子路由间导航时 layout 已经渲染，参数不变就复用数据，提交表单或 `invalidate()` 后重新加载
 */
async function loadLayout(
  load: () => Promise<ElementModule>,
  tag: string,
  routeParams: Params,
  container: ParentNode,
  serverLoad?: boolean,
) {
  const cls = await loadModule(load, tag);
  const params = getLayoutParams(routeParams);
  const current = [...container.children].find((e) => e.localName === tag) as { params?: Params; data?: unknown };
  const data = canReuseLayoutData(current?.params, params)
    ? current!.data
    : await loadData(cls, tag, params, serverLoad);
  defineElement(tag, cls);
  await setRouteMeta(cls, tag, params, data);
  return { params, data };
}

/**
 * 加载页面模块和数据，返回页面数据，`serverLoad` 表示页面的 `*.server.ts` 有 `load`，
 * 错误页面使用 `error` 作为数据
 */
async function loadPage(
  load: () => Promise<ElementModule>,
  tag: string,
  params: Params,
  serverLoad?: boolean,
  error?: ErrorData,
) {
  const cls = await loadModule(load, tag);
  const data = error || (await loadData(cls, tag, params, serverLoad));
  // layout 在页面之前加载
  clientState.invalidated = false;
  defineElement(tag, cls);
  const { title: getTitle } = getPageOptions(cls);
  const title = typeof getTitle === 'function' ? await getTitle({ params, data }) : getTitle;
  if (title !== undefined) titleStore({ title });
  // 页面正常显示时，同一路径之前的错误页面的 meta 不再使用
  if (!error && errorPage) deleteRouteMeta([errorPage.data!.tag]);
  await setRouteMeta(cls, tag, params, data);
  setSSRReady();
  return data;
}

/** 生成的路由的信息，链接预取时使用 */
export interface RouteInfo {
  tag: string;
  load: () => Promise<ElementModule>;
  /** 有 `*.server.ts` */
  server?: boolean;
  /** `*.server.ts` 没有导出 `load`（构建时分析），不需要服务端数据 */
  noLoad?: boolean;
  /** `*.server.ts` 中导出了 `ssr = false`，或者在 `ssr = false` 的 layout 中，服务端不渲染 */
  ssr?: false;
  layout?: boolean;
}

/** 需要加载服务端数据 */
export const hasServerLoad = ({ server, noLoad }: RouteInfo) => server && !noLoad;

/**
 * `ssr = false` 的路由在服务端只输出空的 outlet，由客户端加载和渲染，
 * 它和子路由（也不在服务端渲染）的服务端 `load` 仍然在服务端执行，数据输出到文档中，水合时不需要再请求；
 * 出错时由客户端渲染错误页面，响应使用它的状态码
 */
async function loadClientRoutes(tag: string): Promise<undefined> {
  const { path } = history.getParams();
  const all = matchRoutes(path);
  const routes = all.slice(all.findIndex(({ info }) => info.tag === tag));
  ssrRoutes.tags = [...ssrRoutes.tags, ...routes.map(({ info }) => info.tag)];
  const errors = await Promise.all(
    routes.map(async ({ info, params }) => {
      if (!hasServerLoad(info)) return;
      try {
        setSSRData(path, info.tag, await runServerLoad(info.tag, info.layout ? getLayoutParams(params) : params), true);
      } catch (err) {
        return toRouteError(info.tag, err);
      }
    }),
  );
  // 多个路由出错时使用外层的，和客户端渲染时一致
  const error = errors.find(Boolean);
  if (error) setSSRError(path, error);
  return undefined;
}

/**
 * 导航到 layout 外时，即将移除的 layout 中的 outlet 也会响应路由变化，
 * 它会匹配到不在当前路径上的路由（通常是 404 页面），不应该加载它，否则会覆盖标题
 */
const isMatched = ({ tag }: RouteInfo) => matchRoutes(history.getParams().path).some(({ info }) => info.tag === tag);

// 正在加载或者等待渲染的路由容器，layout 和页面可能并行加载，都渲染后导航结束
const loadingContainers = new Set<ParentNode>();
// 没有错误页面时加载的错误
let loadError: unknown;

/** 路由容器开始加载 layout 或页面 */
function startLoad(container: ParentNode) {
  if (isServer) return;
  loadingContainers.add(container);
  if (!navigationStore.pending) navigationStore({ pending: true });
}

/** 路由容器渲染、出错或者移除，同一个容器中只有最后一次加载会渲染 */
function endLoad(container: ParentNode, err?: unknown) {
  if (!loadingContainers.delete(container)) return;
  loadError ||= err;
  if (loadingContainers.size) return;
  navigationStore({ pending: false });
  settleNavigation(loadError);
  loadError = undefined;
}

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
  setSSRError(path, error);
  const tags = matchRoutes(path).map(({ info }) => info.tag);
  deleteRouteMeta(tags.slice(tags.indexOf(tag)));
  return content(params, { status: error.status, message: error.message });
};

// 两个不同的模板，切换时不复用其中的元素；内容也要不同，开发时 HMR 会把内容相同的模板当作同一个，
// 用空的插值区分，注释会被 html 压缩移除
const pageWrappers = [
  (content: TemplateResult) => html`${content}`,
  (content: TemplateResult) => html`${content}${''}`,
];

/**
 * 创建页面路由，`render` 使用页面的标签名渲染
 *
 * 参数改变时（例如 `/blog/a` 到 `/blog/b`）重新创建页面元素，页面中的元素和状态都不复用；
 * 只有查询参数改变、提交表单或者 `invalidate()` 重新加载时参数不变，复用页面元素。
 * 服务端和水合时使用第一个模板，和 SSR 的内容一致
 */
export function pageRoute(
  pattern: string,
  info: RouteInfo,
  render: (params: Params, data: unknown) => TemplateResult,
): RouteItem<RouteInfo> {
  let current: { key: string; index: number } | undefined;
  const wrap = (params: Params, content: TemplateResult) => {
    if (isServer) return pageWrappers[0](content);
    const key = JSON.stringify(params);
    if (!current) current = { key, index: 0 };
    else if (current.key !== key) current = { key, index: 1 - current.index };
    return pageWrappers[current.index](content);
  };
  return {
    pattern,
    data: info,
    getContent: (params, container) => {
      if (!isMatched(info)) return;
      if (isServer && info.ssr === false) return loadClientRoutes(info.tag);
      startLoad(container);
      return loadPage(info.load, info.tag, params, hasServerLoad(info))
        .then((data) => wrap(params, render(params, data)))
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
    getContent: (params, container) => {
      if (!isMatched(info)) return;
      startLoad(container);
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
      if (isServer && info.ssr === false) return loadClientRoutes(info.tag);
      startLoad(container);
      return loadLayout(info.load, info.tag, params, container, hasServerLoad(info)).then(
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

  #onRouteChange = () => endLoad(this.#routeRef.value!);

  // 没有错误页面时渲染失败，跳转不是错误，会重新加载
  #onError = ({ detail }: CustomEvent) => {
    if (!(detail instanceof Redirect)) endLoad(this.#routeRef.value!, detail);
  };

  // 导航到 layout 外时，加载中的子路由不会再渲染
  @unmounted()
  #onUnmounted = () => endLoad(this.#routeRef.value!);

  // 不在 outlet 中输出空白文本
  @template()
  #content = () =>
    html`<gem-light-route
      ${this.#routeRef}
      .key=${this.#key}
      .routes=${this.#routes}
      .scrollContainer=${this.#getScrollContainer}
      .scrollWait=${waitServerElements}
      @routechange=${this.#onRouteChange}
      @error=${this.#onError}
    ></gem-light-route>`;
}
