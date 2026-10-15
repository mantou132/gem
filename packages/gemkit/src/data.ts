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
  /** 动态路由预渲染时使用的参数列表 */
  paths?: () => Params[] | Promise<Params[]>;
}

type ServerModules = Record<string, () => Promise<ServerModule>>;

// 页面标签名对应的服务端模块
let serverModules: ServerModules = {};

export function setServerModules(modules: ServerModules) {
  serverModules = modules;
}

export function getServerModule(tag: string) {
  return serverModules[tag]?.();
}

/** 服务端渲染时页面的数据，渲染后输出到页面中，水合时直接使用，每个请求有独立的值 */
export const ssrData = createStore<{
  current?: { path: string; data: unknown };
  /** 页面的数据和标题已经确定，可以开始输出文档 */
  ready?: boolean;
}>({});

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

/** 读取服务端渲染时输出的页面数据，只在水合时使用一次 */
export function takeSSRData(path: string) {
  const script = document.getElementById(DATA_SCRIPT_ID);
  if (!script) return;
  script.remove();
  const result: NonNullable<typeof ssrData.current> = JSON.parse(script.textContent!);
  if (result.path === path) return result;
}

/** 加载 `*.server.ts` 的数据，客户端导航时通过数据文件获取 */
export async function loadServerData(tag: string, params: Params) {
  if (isServer) return runServerLoad(tag, params, new URL(location.href));
  const { path } = history.getParams();
  const res = await fetch(history.basePath + getDataPath(path) + location.search);
  if (!res.ok) throw new Error(`gemkit: failed to load data of \`${path}\``);
  return res.json();
}
