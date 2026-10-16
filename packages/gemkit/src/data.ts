import { createStore, history } from '@mantou/gem';
import { isolate, isServer } from '@mantou/gem/lib/server';

import {
  DATA_SCRIPT_ID,
  ELEMENT_PATH,
  ELEMENTS_FILE,
  getDataPath,
  NOT_FOUND_HEADER,
  REDIRECT_HEADER,
} from './constants';
import type { Params } from './page';

export interface CookieOptions {
  /** @default '/' */
  path?: string;
  domain?: string;
  /** 秒 */
  maxAge?: number;
  expires?: Date;
  /** @default true */
  httpOnly?: boolean;
  /** 默认在 HTTPS 请求中为 `true` */
  secure?: boolean;
  /** @default 'Lax' */
  sameSite?: 'Strict' | 'Lax' | 'None';
}

/** 请求的 cookie，`set` 和 `delete` 会添加到响应的 `Set-Cookie` 中，之后的 `get` 读取到新值 */
export interface Cookies {
  get: (name: string) => string | undefined;
  set: (name: string, value: string, options?: CookieOptions) => void;
  delete: (name: string, options?: Pick<CookieOptions, 'path' | 'domain'>) => void;
}

export interface ServerLoadContext<P extends Params = Params> {
  params: P;
  /** 页面的 URL，包含语言前缀 */
  url: URL;
  /** 当前请求，预渲染时不可用，使用的页面和 layout 需要导出 `prerender = false` */
  request: Request;
  /** 当前请求的 cookie，和 `request` 一样预渲染时不可用 */
  cookies: Cookies;
}

/** `*.server.ts` 导出的内容，只在服务端执行 */
export interface ServerModule {
  /** 返回值只能是 JSON 值，可以使用 `redirect` 跳转 */
  load?: (ctx: ServerLoadContext<any>) => unknown;
  /** 动态路由预渲染时使用的参数列表，只对页面有效 */
  paths?: () => Params[] | Promise<Params[]>;
  /** 为 `false` 时不预渲染，在 layout 中设置时对其中的页面都有效 */
  prerender?: boolean;
  /**
   * 处理表单提交 `POST <page path>?/<name>`，只对页面有效，返回值只能是 JSON 值，
   * 可以使用 `redirect` 跳转
   */
  actions?: Record<string, (ctx: ServerLoadContext<any>) => unknown>;
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

export class Redirect {
  constructor(
    public status: number,
    public location: string,
  ) {}
}

/**
 * 在 `load` 或 `actions` 中跳转到 `location`，`location` 是完整的路径，包括语言前缀
 *
 * 表单提交时总是使用 303 跳转
 */
export function redirect(status: 301 | 302 | 303 | 307 | 308, location: string): never {
  throw new Redirect(status, location);
}

export class NotFound {}

/**
 * 在 `load` 中表示路由参数对应的内容不存在，例如文章不存在，渲染 404 页面（`_404`），状态码为 404，地址不变
 */
export function notFound(): never {
  throw new NotFound();
}

/** 当前请求的状态，每个请求有独立的值 */
export const requestState = isolate<{
  /** 预渲染时没有 */
  request?: Request;
  cookies?: Cookies;
  /** `load` 中的跳转，渲染时不再输出内容 */
  redirect?: Redirect;
  /** `load` 中调用了 `notFound()`，状态码为 404 */
  notFound?: boolean;
  /** 读取了 `request` 或 `cookies`，响应因人而异，不能被共享缓存 */
  personal?: boolean;
}>({});

/** 页面和 layout 的数据，key 是标签名 */
export type RouteData = Record<string, unknown>;

/**
 * 服务端渲染时页面和 layout 的数据，渲染后输出到页面中，水合时直接使用，每个请求有独立的值
 *
 * 不使用 store，避免被当作需要同步的 store 输出
 */
export const ssrData = isolate<{
  /** `notFound` 是 `load` 中调用了 `notFound()` 的路由的标签名 */
  current?: { path: string; data: RouteData; notFound?: string };
  /** 页面的数据和标题已经确定，可以开始输出文档 */
  ready?: boolean;
}>({});

export function setSSRData(path: string, tag: string, data: unknown) {
  ssrData.current ||= { path, data: {} };
  ssrData.current.data[tag] = data;
}

/** 服务端渲染时路由的 `load` 调用了 `notFound()`，水合时直接渲染 404 页面 */
export function setSSRNotFound(path: string, tag: string) {
  requestState.notFound = true;
  ssrData.current ||= { path, data: {} };
  ssrData.current.notFound = tag;
}

/** 转换成 JSON 值，保证客户端拿到的数据和服务端一致 */
export function toJSONValue(value: unknown) {
  const json = JSON.stringify(value);
  return json === undefined ? null : JSON.parse(json);
}

/** 服务端模块的 `load` 和 `actions` 的参数 */
export function createServerContext(tag: string, params: Params, url: URL): ServerLoadContext {
  const get = <K extends 'request' | 'cookies'>(key: K) => {
    const value = requestState[key];
    if (!value) {
      throw new Error(`gemkit: \`${key}\` is not available when prerendering, export \`prerender = false\` (${tag})`);
    }
    requestState.personal = true;
    return value as NonNullable<(typeof requestState)[K]>;
  };
  return {
    params,
    url,
    get request() {
      return get('request');
    },
    get cookies() {
      return get('cookies');
    },
  };
}

/** 执行服务端模块的 `load`，跳转时记录到 `requestState`，渲染以这个错误结束 */
export async function runServerLoad(tag: string, params: Params, url: URL) {
  const mod = await getServerModule(tag);
  try {
    return toJSONValue(await mod?.load?.(createServerContext(tag, params, url)));
  } catch (err) {
    if (err instanceof Redirect) requestState.redirect ||= err;
    throw err;
  }
}

let ssrResult: typeof ssrData.current | null | undefined;

/** 读取服务端渲染时输出的数据，只在水合时使用，每个元素只使用一次 */
export function takeSSRData(path: string, tag: string) {
  if (ssrResult === undefined) {
    const script = document.getElementById(DATA_SCRIPT_ID);
    script?.remove();
    ssrResult = script ? JSON.parse(script.textContent!) : null;
  }
  if (!ssrResult || ssrResult.path !== path) return;
  if (ssrResult.notFound === tag) {
    delete ssrResult.notFound;
    throw new NotFound();
  }
  if (!(tag in ssrResult.data)) return;
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

/** 路由的 `key`，改变时重新渲染所有路由 */
export const outletStore = createStore({ key: 0 });

/** 客户端在提交表单后需要重新加载数据，layout 不再复用数据，加载页面后重置 */
export const clientState = { invalidated: false };

/** 客户端跳转到 `href`，语言（`basePath`）不同时重新加载页面，和当前地址相同时重新渲染路由 */
function navigate(href: string, replace = false) {
  const { origin, pathname, search, hash } = new URL(href, location.href);
  const { basePath } = history;
  if (origin !== location.origin || (basePath && pathname !== basePath && !pathname.startsWith(`${basePath}/`))) {
    location.assign(href);
    return;
  }
  const path = pathname.slice(basePath.length) || '/';
  const current = history.getParams();
  if (path === current.path && new URLSearchParams(search).toString() === String(current.query)) {
    outletStore({ key: outletStore.key + 1 });
  } else {
    history[replace ? 'replace' : 'push']({ path, query: search, hash });
  }
}

/** 数据请求的结果，`notFound` 是 `load` 中调用了 `notFound()` 的路由的标签名 */
type DataResult = { data: RouteData; notFound: string | null };

// 同一次导航中 layout 和页面共用一个数据请求，再次使用时重新请求
let dataRequest: { url: string; promise: Promise<DataResult>; taken: Set<string> } | undefined;

async function fetchData(url: string, path: string): Promise<DataResult> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`gemkit: failed to load data of \`${path}\``);
  // 服务端 `load` 中的跳转，预取时不跳转，使用数据时再跳转
  const redirectTo = res.headers.get(REDIRECT_HEADER);
  if (redirectTo) throw new Redirect(302, redirectTo);
  return { data: await res.json(), notFound: res.headers.get(NOT_FOUND_HEADER) };
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
    const promise = (takePrefetched<DataResult>(url) || fetchData(url, path)).catch((err) => {
      // 替换当前导航，中断当前路由的渲染，layout 和页面共用请求，只跳转一次
      if (err instanceof Redirect) navigate(err.location, true);
      throw err;
    });
    dataRequest = { url, promise, taken: new Set() };
  }
  dataRequest.taken.add(tag);
  const { data, notFound } = await dataRequest.promise;
  if (notFound === tag) throw new NotFound();
  return data[tag];
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

/** `actions` 的结果 */
export type ActionResult = { type: 'success'; data: unknown } | { type: 'redirect'; location: string };

/**
 * 不刷新页面提交表单到 `actions`，提交的地址是表单（或者 `submitter`）的 `action`，例如 `?/login`
 *
 * 跳转时客户端导航，否则重新加载当前页面的数据，返回 action 的返回值
 *
 * @example
 * ```ts
 * html`<form method="post" action="?/login" @submit=${this.#submit}></form>`;
 *
 * #submit = async (evt: SubmitEvent) => {
 *   evt.preventDefault();
 *   this.#state({ errors: await submitAction(evt.target as HTMLFormElement, evt.submitter) });
 * };
 * ```
 */
export async function submitAction(form: HTMLFormElement, submitter?: HTMLElement | null) {
  const action = submitter?.getAttribute('formaction') ? (submitter as HTMLButtonElement).formAction : form.action;
  const res = await fetch(action, {
    method: 'POST',
    headers: { accept: 'application/json' },
    body: new FormData(form, submitter),
  });
  if (!res.ok) throw new Error(`gemkit: failed to submit \`${action}\``);
  const result: ActionResult = await res.json();
  // 提交后 cookie 等状态可能改变，之前的数据都不能再使用
  clientState.invalidated = true;
  prefetched.clear();
  if (result.type === 'redirect') {
    navigate(result.location);
    return;
  }
  navigate(location.href, true);
  return result.data;
}
