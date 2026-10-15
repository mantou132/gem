import { createStore, history } from '@mantou/gem';
import { isServer } from '@mantou/gem/lib/server';

import { DATA_SCRIPT_ID, getDataPath } from './constants';
import type { Params } from './page';

export interface ServerLoadContext<P extends Params = Params> {
  params: P;
  /** 页面的 URL，包含语言前缀 */
  url: URL;
}

/** `*.server.ts` 导出的内容，只在服务端执行 */
export interface ServerModule {
  /** 返回值只能是 JSON 值 */
  load?: (ctx: ServerLoadContext<any>) => unknown;
  /** 动态路由预渲染时使用的参数列表，只对页面有效 */
  paths?: () => Params[] | Promise<Params[]>;
}

type ServerModules = Record<string, () => Promise<ServerModule>>;

// 页面和 layout 的标签名对应的服务端模块
let serverModules: ServerModules = {};

export function setServerModules(modules: ServerModules) {
  serverModules = modules;
}

export function getServerModule(tag: string) {
  return serverModules[tag]?.();
}

/** 页面和 layout 的数据，key 是标签名 */
export type RouteData = Record<string, unknown>;

/** 服务端渲染时页面和 layout 的数据，渲染后输出到页面中，水合时直接使用，每个请求有独立的值 */
export const ssrData = createStore<{
  current?: { path: string; data: RouteData };
  /** 页面的数据和标题已经确定，可以开始输出文档 */
  ready?: boolean;
}>({});

export function setSSRData(path: string, tag: string, data: unknown) {
  if (!ssrData.current) ssrData({ current: { path, data: {} } });
  ssrData.current!.data[tag] = data;
}

/** 转换成 JSON 值，保证客户端拿到的数据和服务端一致 */
export function toJSONValue(value: unknown) {
  const json = JSON.stringify(value);
  return json === undefined ? null : JSON.parse(json);
}

/** 执行服务端模块的 `load` */
export async function runServerLoad(tag: string, params: Params, url: URL) {
  const mod = await getServerModule(tag);
  return toJSONValue(await mod?.load?.({ params, url }));
}

let ssrResult: typeof ssrData.current | null | undefined;

/** 读取服务端渲染时输出的数据，只在水合时使用，每个元素只使用一次 */
export function takeSSRData(path: string, tag: string) {
  if (ssrResult === undefined) {
    const script = document.getElementById(DATA_SCRIPT_ID);
    script?.remove();
    ssrResult = script ? JSON.parse(script.textContent!) : null;
  }
  if (!ssrResult || ssrResult.path !== path || !(tag in ssrResult.data)) return;
  const data = ssrResult.data[tag];
  delete ssrResult.data[tag];
  return { data };
}

// 同一次导航中 layout 和页面共用一个数据请求，再次使用时重新请求
let dataRequest: { url: string; promise: Promise<RouteData>; taken: Set<string> } | undefined;

async function fetchData(url: string, path: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`gemkit: failed to load data of \`${path}\``);
  return res.json() as Promise<RouteData>;
}

/** 加载 `*.server.ts` 的数据，客户端导航时通过数据文件获取 */
export async function loadServerData(tag: string, params: Params) {
  if (isServer) return runServerLoad(tag, params, new URL(location.href));
  const { path } = history.getParams();
  const url = history.basePath + getDataPath(path) + location.search;
  if (dataRequest?.url !== url || dataRequest.taken.has(tag)) {
    dataRequest = { url, promise: fetchData(url, path), taken: new Set() };
  }
  dataRequest.taken.add(tag);
  return (await dataRequest.promise)[tag];
}
