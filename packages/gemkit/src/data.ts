import { history } from '@mantou/gem';
import { isolate, isServer } from '@mantou/gem/lib/server';

import { DATA_SCRIPT_ID, ELEMENT_PATH, ELEMENTS_FILE, getDataPath } from './constants';
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

/**
 * 服务端渲染时页面和 layout 的数据，渲染后输出到页面中，水合时直接使用，每个请求有独立的值
 *
 * 不使用 store，避免被当作需要同步的 store 输出
 */
export const ssrData = isolate<{
  current?: { path: string; data: RouteData };
  /** 页面的数据和标题已经确定，可以开始输出文档 */
  ready?: boolean;
}>({});

export function setSSRData(path: string, tag: string, data: unknown) {
  ssrData.current ||= { path, data: {} };
  ssrData.current.data[tag] = data;
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

// 预取的结果在这段时间内有效
const PREFETCH_TTL = 30_000;

// 预取的请求，key 是 URL，导航时只使用一次，避免使用过时的数据
const prefetched = new Map<string, { time: number; promise: Promise<any> }>();

function prefetchRequest(url: string, request: () => Promise<unknown>) {
  const now = Date.now();
  for (const [key, { time }] of prefetched) {
    if (now - time >= PREFETCH_TTL) prefetched.delete(key);
  }
  if (prefetched.has(url)) return;
  const promise = request();
  // 没有使用的预取忽略错误
  promise.catch(() => {});
  prefetched.set(url, { time: now, promise });
}

function takePrefetched<T>(url: string): Promise<T> | undefined {
  const item = prefetched.get(url);
  prefetched.delete(url);
  if (item && Date.now() - item.time < PREFETCH_TTL) return item.promise;
}

/** 页面路径（不包含语言前缀）对应的数据文件 URL */
const getFileUrl = (path: string, search: string, file?: string) => history.basePath + getDataPath(path, file) + search;

// 同一次导航中 layout 和页面共用一个数据请求，再次使用时重新请求
let dataRequest: { url: string; promise: Promise<RouteData>; taken: Set<string> } | undefined;

async function fetchData(url: string, path: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`gemkit: failed to load data of \`${path}\``);
  return res.json() as Promise<RouteData>;
}

/** 预取页面的服务端数据 */
export function prefetchServerData(path: string, search: string) {
  const url = getFileUrl(path, search);
  prefetchRequest(url, () => fetchData(url, path));
}

/** 加载 `*.server.ts` 的数据，客户端导航时通过数据文件获取 */
export async function loadServerData(tag: string, params: Params) {
  if (isServer) return runServerLoad(tag, params, new URL(location.href));
  const { path } = history.getParams();
  const url = getFileUrl(path, location.search);
  if (dataRequest?.url !== url || dataRequest.taken.has(tag)) {
    dataRequest = { url, promise: takePrefetched(url) || fetchData(url, path), taken: new Set() };
  }
  dataRequest.taken.add(tag);
  return (await dataRequest.promise)[tag];
}

/** 纯服务端元素的标签名、attribute 和 property */
export interface ServerElementParams {
  tag: string;
  attrs: Record<string, string>;
  props: Record<string, unknown>;
}

// 页面中纯服务端元素的 HTML，同一个页面的元素共用一个请求
let elementsRequest: { url: string; promise: Promise<Record<string, string>> } | undefined;

// 同一轮渲染中需要服务端渲染的元素合并成一个请求
let renderBatch: { url: string; elements: ServerElementParams[]; promise: Promise<string[]> } | undefined;

function renderElement(url: string, element: ServerElementParams) {
  if (renderBatch?.url !== url) {
    const batch = { url, elements: [] as ServerElementParams[], promise: Promise.resolve([] as string[]) };
    // 等同一轮的元素都加入后再请求
    batch.promise = Promise.resolve().then(async () => {
      if (renderBatch === batch) renderBatch = undefined;
      const res = await fetch(ELEMENT_PATH, {
        method: 'POST',
        body: JSON.stringify({ url, elements: batch.elements }),
      });
      if (!res.ok) throw new Error(`gemkit: failed to render server elements of \`${url}\``);
      return res.json();
    });
    renderBatch = batch;
  }
  const index = renderBatch.elements.push(element) - 1;
  return renderBatch.promise.then((list) => list[index]);
}

const fetchElements = (url: string): Promise<Record<string, string>> =>
  fetch(url).then((res) => (res.ok ? res.json() : {}));

/** 预取页面中纯服务端元素的 HTML */
export function prefetchElements(path: string, search: string) {
  const url = getFileUrl(path, search, ELEMENTS_FILE);
  prefetchRequest(url, () => fetchElements(url));
}

/** 获取当前页面中纯服务端元素的 HTML，导航时调用可以和页面模块、数据并行 */
export function loadPageElements() {
  const url = getFileUrl(history.getParams().path, location.search, ELEMENTS_FILE);
  if (elementsRequest?.url !== url) elementsRequest = { url, promise: takePrefetched(url) || fetchElements(url) };
  return elementsRequest.promise;
}

/**
 * 客户端创建纯服务端元素时获取 HTML，先从预渲染的 `__elements.json` 中获取，
 * 没有时（例如没有预渲染或者交互后才出现的元素）请求服务端渲染，静态托管时不可用
 */
export async function loadServerElement(
  key: string,
  tag: string,
  attrs: ServerElementParams['attrs'],
  props: ServerElementParams['props'],
) {
  const pageUrl = history.basePath + history.getParams().path + location.search;
  const html = (await loadPageElements())[key];
  if (html !== undefined) return html;
  return renderElement(pageUrl, { tag, attrs, props });
}
