import { matchPath, type TemplateResult } from '@mantou/gem';
import type { RouteItem } from '@mantou/gem/elements/base/route';

import type { ErrorData } from './error';
import type { Params } from './page';

type ElementModule = { default: CustomElementConstructor };

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
  /** `[...rest]` 的参数名 */
  rest?: string;
}

/** 需要加载服务端数据 */
export const hasServerLoad = ({ server, noLoad }: RouteInfo) => server && !noLoad;

/** 渲染一层路由，`params` 是元素的参数，`data` 是加载的数据或者错误页面的 `ErrorData` */
type Render = (params: Params, data: unknown) => TemplateResult;

// 每个 layout 的子路由，key 是 layout 的标签名，根路由的 key 为空字符串
let outletRoutes: Record<string, RouteItem<RouteInfo>[]> = {};

// 错误页面，也是没有匹配时的 404 页面，`handle`、`load` 等出错时渲染在出错的路由的位置
export let errorPage: RouteInfo | undefined;

// 路由的渲染函数
const renders = new Map<RouteInfo, Render>();

export const getRender = (info: RouteInfo) => renders.get(info)!;

export function setRoutes(routes: Record<string, RouteItem<RouteInfo>[]>, error?: RouteItem<RouteInfo>) {
  outletRoutes = routes;
  errorPage = error?.data;
}

/** 有子路由的 layout 的标签名，根路由为空字符串 */
export const isOwner = (tag: string) => tag in outletRoutes;

/** 创建页面路由，`render` 使用页面的标签名渲染 */
export function pageRoute(pattern: string, info: RouteInfo, render: Render): RouteItem<RouteInfo> {
  renders.set(info, render);
  return { pattern, data: info };
}

/** 创建错误页面的路由，没有匹配的路由时渲染 404，`render` 使用页面的标签名渲染 */
export function errorRoute(info: RouteInfo, render: (params: Params, error: ErrorData) => TemplateResult) {
  renders.set(info, render as Render);
  return { pattern: '*', data: info } satisfies RouteItem<RouteInfo>;
}

/**
 * 创建 layout 路由，`render` 使用 layout 的标签名渲染，返回的函数为每个匹配的路径创建路由；
 * 路由分组的 layout 匹配多个路径，它们是同一个 layout，在其中的页面间导航时复用 layout 元素
 */
export function layoutRoute(
  info: RouteInfo,
  render: (props: { params: Params; data: unknown }) => TemplateResult,
): (pattern: string) => RouteItem<RouteInfo> {
  const data = { ...info, layout: true };
  renders.set(data, (params, value) => render({ params, data: value }));
  return (pattern) => ({ pattern, data });
}

/** `*` 匹配的参数名是 `0`，改成 `[...rest]` 的参数名 */
export function nameRestParam(params: Params, rest?: string) {
  if (!rest) return params;
  const { 0: value, ...others } = params;
  return { ...others, [rest]: value };
}

/** 子路由匹配的部分（`*`）不属于 layout 的参数 */
export const getLayoutParams = (params: Params) =>
  Object.fromEntries(Object.entries(params).filter(([key]) => !/^\d+$/.test(key)));

/** 路径匹配的一层路由，`params` 是元素的参数，layout 不包括子路由匹配的部分 */
export type MatchedRoute = { info: RouteInfo; params: Params };

/** 路径匹配的 layout 和页面（或者 404 页面），从根路由逐层匹配 */
export function matchRoutes(path: string) {
  const result: MatchedRoute[] = [];
  let routes: RouteItem<RouteInfo>[] | undefined = outletRoutes[''];
  while (routes) {
    let params: Params | null = null;
    const info: RouteInfo | undefined = routes.find(({ pattern }) => (params = matchPath(pattern, path)))?.data;
    if (!info || !params) break;
    const named = nameRestParam(params, info.rest);
    result.push({ info, params: info.layout ? getLayoutParams(named) : named });
    routes = info.layout ? outletRoutes[info.tag] : undefined;
  }
  return result;
}

/** 路径匹配的页面，没有匹配时（渲染 404 页面）返回 `undefined` */
export function matchPage(path: string) {
  const page = matchRoutes(path).at(-1);
  if (page && !page.info.layout && page.info !== errorPage) return page;
}

/** 所有页面路由，不包括错误页面 */
export function getPageRoutes() {
  return Object.values(outletRoutes)
    .flat()
    .filter(({ data }) => data && !data.layout && data !== errorPage)
    .map(({ pattern, data }) => ({ info: data!, pattern }));
}
