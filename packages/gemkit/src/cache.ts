// 客户端获取和缓存服务端的数据：服务端渲染的数据、预取的请求、历史记录的缓存和数据文件

import { history } from '@mantou/gem';

import { DATA_SCRIPT_ID, getDataPath } from './constants';
import { notFound, Redirect } from './error';
import type { ssrData } from './request';
import type { DataFile, RouteData, RouteDataFile } from './types';

declare const __webpack_hash__: string;

/** 客户端构建的 hash，服务端渲染的内容带有生成它们的版本，开发时和测试中没有 */
const clientVersion = typeof __webpack_hash__ === 'string' ? __webpack_hash__ : undefined;

/** 服务端的内容来自重新部署后的版本，当前页面的代码已经过时 */
export class Outdated {}

/** 服务端的内容和客户端的代码属于不同的版本时抛出 `Outdated`，开发时服务端没有版本 */
export function checkVersion(version?: string) {
  if (version && version !== clientVersion) throw new Outdated();
}

/**
 * 重新加载当前地址，加载新版本的代码和内容，返回不会完成的 Promise，中断渲染；
 * 导航时地址已经是目标地址
 */
export function reload(): Promise<never> {
  location.reload();
  return new Promise(() => {});
}

/** 重新部署后旧的 chunk 不存在了，或者服务端的内容来自新的版本 */
export const isOutdated = (err: unknown) =>
  err instanceof Outdated ||
  (err as Error)?.name === 'ChunkLoadError' ||
  (err as { code?: string })?.code === 'CSS_CHUNK_LOAD_FAILED';

let ssrResult: typeof ssrData.current | null | undefined;

/** 服务端渲染时输出的数据，只在水合时使用 */
function getSSRResult() {
  if (ssrResult === undefined) {
    const script = document.getElementById(DATA_SCRIPT_ID);
    script?.remove();
    ssrResult = script ? JSON.parse(script.textContent!) : null;
  }
  return ssrResult;
}

/** 读取服务端渲染时输出的数据，只在水合时使用，每个元素只使用一次 */
export function takeSSRData(path: string, tag: string) {
  const ssrResult = getSSRResult();
  if (!ssrResult || ssrResult.path !== path || !(tag in ssrResult.data)) return;
  const data = ssrResult.data[tag];
  delete ssrResult.data[tag];
  return { data };
}

/** 服务端渲染时出错的路由，水合时直接渲染错误页面 */
export const takeSSRError = (path: string) => (getSSRResult()?.path === path ? ssrResult!.error : undefined);

// 预取的结果在这段时间内有效
const PREFETCH_TTL = 30_000;

// 预取的请求，key 是 URL，导航时只使用一次，避免使用过时的数据
const prefetched = new Map<string, { time: number; promise: Promise<any> }>();

export function prefetchRequest(url: string, request: () => Promise<unknown>) {
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

export function takePrefetched<T>(url: string): Promise<T> | undefined {
  const item = prefetched.get(url);
  prefetched.delete(url);
  if (item && Date.now() - item.time < PREFETCH_TTL) return item.promise;
}

// 最多缓存的历史记录数量
const HISTORY_CACHE_SIZE = 50;

/** 历史记录离开时的状态，`data` 是 layout 和页面的数据，key 是标签名，`elements` 是纯服务端元素的 HTML */
type HistoryEntry = { data: RouteData; elements: Record<string, string> };

// 前进后退时恢复历史记录离开时的状态，不再请求，key 是历史记录的 key，导航到新的历史记录时总是重新请求
const historyCache = new Map<string, HistoryEntry>();

/** 历史记录的缓存，默认是当前的历史记录 */
export const getHistoryEntry = (key = history.currentKey) => historyCache.get(key);

/** 更新历史记录的缓存，`key` 是开始加载时的历史记录，加载期间可能已经导航，只保留最近更新的历史记录 */
export function updateHistoryEntry(key: string, update: (entry: HistoryEntry) => void) {
  const entry = historyCache.get(key) || { data: {}, elements: {} };
  update(entry);
  historyCache.delete(key);
  historyCache.set(key, entry);
  if (historyCache.size > HISTORY_CACHE_SIZE) historyCache.delete(historyCache.keys().next().value!);
}

/** 缓存历史记录中 layout 或页面的数据 */
export function cacheHistoryData(key: string, tag: string, data: unknown) {
  updateHistoryEntry(key, (entry) => {
    entry.data[tag] = data;
  });
}

/** 页面路径（不包含语言前缀）对应的数据文件 URL */
export const getFileUrl = (path: string, search: string, file?: string) =>
  history.basePath + getDataPath(path, file) + search;

/** 获取页面的数据文件，静态托管时没有预渲染的页面没有数据文件，和没有匹配的路由一样是 404 */
export async function fetchData(url: string, path: string): Promise<RouteDataFile> {
  const res = await fetch(url);
  if (res.status === 404) notFound();
  if (!res.ok) throw new Error(`gemkit: failed to load data of \`${path}\``);
  const file: DataFile = await res.json();
  checkVersion(file.version);
  // 服务端 `load` 中的跳转，预取时不跳转，使用数据时再跳转
  if ('redirect' in file) throw new Redirect(302, file.redirect);
  return file;
}

/** 预取页面的服务端数据 */
export function prefetchServerData(path: string, search: string) {
  const url = getFileUrl(path, search);
  prefetchRequest(url, () => fetchData(url, path));
}

/** 客户端导航时获取页面的服务端数据，优先使用预取的请求 */
export function fetchServerData(path: string, search: string) {
  const url = getFileUrl(path, search);
  return (takePrefetched<RouteDataFile>(url) || fetchData(url, path)).catch((err) => {
    // 不能使用新版本的数据渲染旧的页面
    if (err instanceof Outdated) return reload();
    throw err;
  });
}

/** 预取的结果和历史缓存都不再使用，例如修改数据或者登录后 */
export function clearClientCache() {
  prefetched.clear();
  historyCache.clear();
}
