import { createStore, history } from '@mantou/gem';
import { isolate, isServer } from '@mantou/gem/lib/server';

import { DATA_SCRIPT_ID, ELEMENT_PATH, ELEMENTS_FILE, getDataPath, REDIRECT_HEADER } from './constants';
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

/**
 * 当前请求中共享的数据，在 `src/app.server.ts` 的 `handle` 中设置，例如当前用户，
 * 使用 `declare module '@mantou/gemkit'` 扩展类型
 */
// biome-ignore lint/suspicious/noEmptyInterface: 由项目扩展
export interface Locals {}

/**
 * 部署平台的环境变量和绑定，例如 Cloudflare 的 KV、D1、AI，
 * 使用 `declare module '@mantou/gemkit'` 声明类型
 */
// biome-ignore lint/suspicious/noEmptyInterface: 由项目扩展
export interface PlatformEnv {}

/** 部署平台的请求上下文，使用 `declare module '@mantou/gemkit'` 声明平台提供的其他字段 */
export interface PlatformContext {
  /** 响应后继续执行后台任务，serverless 平台需要它才不会在响应后中止 */
  waitUntil(promise: Promise<unknown>): void;
}

/** 部署平台提供的环境和上下文 */
export interface Platform {
  /** Cloudflare 是 Worker 的 `env`，其他平台是 `process.env` */
  env: PlatformEnv;
  /** Cloudflare 是 `ExecutionContext`，Netlify 是 `Context`，Node.js 和 Vercel 只有 `waitUntil` */
  ctx: PlatformContext;
}

export interface RequestEvent {
  /** 页面的 URL，包含语言前缀 */
  url: URL;
  /** 页面的路径，不包含语言前缀，和路由匹配的路径一致，按路径检查权限时使用 */
  path: string;
  /** 当前请求，预渲染时不可用，使用的页面和 layout 需要导出 `prerender = false` */
  request: Request;
  /** 当前请求的 cookie，和 `request` 一样预渲染时不可用 */
  cookies: Cookies;
  locals: Locals;
  /** 部署平台的环境和上下文，构建时预渲染时没有 */
  platform?: Platform;
}

export interface ServerLoadContext<P extends Params = Params> extends RequestEvent {
  params: P;
}

/** `src/app.server.ts` 导出的内容，只在服务端执行 */
export interface AppServerModule {
  /**
   * 页面、页面数据、表单提交、API 路由和纯服务端元素的请求都先执行，
   * 可以使用 `redirect` 跳转（纯服务端元素不渲染，客户端跳转），使用 `locals` 传递数据
   *
   * 预渲染前也执行，读取了 `request`、`cookies` 或者跳转的路径不预渲染
   */
  handle?: (event: RequestEvent) => unknown;
  /**
   * `handle`、`load`、`actions`、API 路由中抛出的非 `error()` 错误，用来记录日志或者上报，默认使用 `console.error`，
   * 页面显示状态码 500，生产环境不显示错误信息
   */
  handleError?: (error: unknown, event: RequestEvent) => unknown;
}

/** `*.server.ts` 导出的内容，只在服务端执行 */
export interface ServerModule {
  /** 返回值只能是 JSON 值，可以使用 `redirect` 跳转 */
  load?: (ctx: ServerLoadContext<any>) => unknown;
  /** 动态路由预渲染时使用的参数列表，只对页面有效，每个语言分别调用，没有多语言时 `lang` 为空字符串 */
  paths?: (ctx: { lang: string }) => Params[] | Promise<Params[]>;
  /** 为 `false` 时不预渲染，在 layout 中设置时对其中的页面都有效 */
  prerender?: boolean;
  /**
   * 为 `false` 时服务端不执行页面或 layout 模块（构建时替换成空模块），只输出空的 outlet，由客户端加载、渲染，
   * `load` 仍然在服务端执行，数据输出到文档中；在 layout 中设置时对其中的页面都有效，在根 layout 中设置时是单页应用。
   * 构建时读取，只能写成 `export const ssr = false`
   */
  ssr?: false;
  /**
   * 增量静态再生成（ISR）的秒数：`gemkit start` 第一次请求时渲染并缓存，过期后先返回旧内容，在后台重新渲染，
   * 构建时预渲染的结果也写到缓存中；layout 和页面都设置时使用最小的，和预渲染的条件一样
   */
  revalidate?: number;
  /**
   * 处理表单提交 `POST <page path>?/<name>`，返回值只能是 JSON 值，可以使用 `redirect` 跳转；
   * 在 layout 中定义时对其中的页面都有效，页面和内层 layout 的同名 action 覆盖外层的
   */
  actions?: Record<string, (ctx: ServerLoadContext<any>) => unknown>;
}

export type ServerModules = Record<string, () => Promise<ServerModule>>;

export type RequestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * 返回 `Response`，其他值作为 JSON 响应，可以使用 `redirect` 跳转和 `error` 响应错误，
 * `input` 是 `GET` `DELETE` 的查询参数，其他方法的 JSON 请求体，`$gemkit/api` 根据它的类型推导调用参数
 */
export type RequestHandler<P extends Params = Params> = (ctx: ServerLoadContext<P>, input?: any) => unknown;

/**
 * API 路由：没有同名页面模块的 `*.server.ts`，按请求方法导出处理函数，`HEAD` 使用 `GET`
 *
 * @example
 * ```ts
 * // src/pages/api/likes/[slug].server.ts -> /api/likes/:slug
 * export const GET = ({ params }: ServerLoadContext<{ slug: string }>) => ({ likes: getLikes(params.slug) });
 * ```
 */
export type EndpointModule = Partial<Record<RequestMethod, RequestHandler<any>>>;

/** Standard Schema（https://standardschema.dev），zod、valibot、arktype 等都实现了它 */
export interface StandardSchemaV1<Input = unknown, Output = Input> {
  readonly '~standard': {
    readonly version: 1;
    readonly vendor: string;
    readonly validate: (
      value: unknown,
    ) =>
      | { readonly value: Output; readonly issues?: undefined }
      | { readonly issues: readonly SchemaIssue[] }
      | Promise<{ readonly value: Output; readonly issues?: undefined } | { readonly issues: readonly SchemaIssue[] }>;
    readonly types?: { readonly input: Input; readonly output: Output };
  };
}

/** 校验失败的问题，`path` 是出错字段的路径 */
export interface SchemaIssue {
  readonly message: string;
  readonly path?: readonly (PropertyKey | { readonly key: PropertyKey })[];
}

type SchemaOutput<S extends StandardSchemaV1> = NonNullable<S['~standard']['types']>['output'];

/**
 * 使用 schema 校验 API 路由的输入，失败时响应 `400`，错误的 `issues` 是校验的问题
 *
 * 查询参数的值都是字符串，需要转换类型时使用 schema 的转换，例如 `z.coerce.number()`；
 * `$gemkit/api` 的参数类型是 schema 的输出类型，作为查询参数传输时变成字符串，由 schema 转换回来
 *
 * @example
 * ```ts
 * export const POST = endpoint(z.object({ count: z.coerce.number() }), ({ params }, { count }) => addLikes(params.slug, count));
 * ```
 */
export function endpoint<S extends StandardSchemaV1, P extends Params, R>(
  schema: S,
  handler: (ctx: ServerLoadContext<P>, input: SchemaOutput<S>) => R,
) {
  return async (ctx: ServerLoadContext<P>, input: SchemaOutput<S>) => {
    const result = await schema['~standard'].validate(input);
    if (result.issues) throw new HttpError(400, 'Invalid input', result.issues);
    return handler(ctx, result.value as SchemaOutput<S>);
  };
}

export type Endpoints = { pattern: string; load: () => Promise<EndpointModule> }[];

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
 * 在 `handle`、`load`、`actions` 或 API 路由中跳转到 `location`，`location` 是完整的路径，包括语言前缀
 *
 * 表单提交时总是使用 303 跳转，`$gemkit/api` 调用时客户端导航
 */
export function redirect(status: 301 | 302 | 303 | 307 | 308, location: string): never {
  throw new Redirect(status, location);
}

/** 错误页面（`_error`）的 `data`，以及 API 路由的错误响应，`issues` 是 schema 校验的问题 */
export interface ErrorData {
  status: number;
  message: string;
  issues?: readonly SchemaIssue[];
}

export class HttpError implements ErrorData {
  constructor(
    public status: number,
    public message: string,
    public issues?: readonly SchemaIssue[],
  ) {}
}

/** 出错的路由，错误页面渲染在它的位置，`tag` 是它的标签名 */
export type RouteError = ErrorData & { tag: string };

/**
 * 在 `handle`、`load`、`actions` 或 API 路由中抛出错误，页面中渲染错误页面（`_error`），地址不变，API 路由响应 JSON 错误
 *
 * `load` 中出错时，错误页面渲染在该页面或 layout 的位置，上层的 layout 保留
 */
export function error(status: number, message = ''): never {
  throw new HttpError(status, message);
}

/** 路由参数对应的内容不存在，例如文章不存在，等同于 `error(404, 'Not Found')` */
export function notFound(): never {
  error(404, 'Not Found');
}

const logError = (err: unknown) => console.error(err);

let errorHandler: NonNullable<AppServerModule['handleError']> = logError;

export function setErrorHandler(handler: AppServerModule['handleError']) {
  errorHandler = handler || logError;
}

/** 当前请求的状态，每个请求有独立的值 */
export const requestState = isolate<{
  /** 预渲染时没有 */
  request?: Request;
  cookies?: Cookies;
  /** 构建时预渲染时没有 */
  platform?: Platform;
  /** 页面的 URL 和不包含语言前缀的路径，执行 `handle` 前设置 */
  url?: URL;
  path?: string;
  locals?: Locals;
  /** `load` 中的跳转，渲染时不再输出内容 */
  redirect?: Redirect;
  /** 出错的路由，`handle` 中出错时在渲染前设置，响应使用它的状态码 */
  error?: RouteError;
  /** 读取了 `request` 或 `cookies`，响应因人而异，不能被共享缓存 */
  personal?: boolean;
}>({});

/** 页面和 layout 的数据，key 是标签名 */
export type RouteData = Record<string, unknown>;

/**
 * 数据文件（`__data.json`）的内容，跳转时只有 `redirect`，`error` 是出错的路由
 *
 * 静态托管时不能设置响应头，所以都放在内容中
 */
export type DataFile = RouteDataFile | { redirect: string };

type RouteDataFile = { data: RouteData; error?: RouteError };

/**
 * 服务端渲染时页面和 layout 的数据，渲染后输出到页面中，水合时直接使用，每个请求有独立的值
 *
 * 不使用 store，避免被当作需要同步的 store 输出
 */
export const ssrData = isolate<{
  /** `error` 是出错的路由 */
  current?: { path: string; data: RouteData; error?: RouteError };
  /** 页面的数据和标题已经确定，可以开始输出文档 */
  ready?: boolean;
}>({});

// 客户端也调用下面的函数，内部判断服务端，只在服务端使用的代码才能在客户端构建时移除

/**
 * 服务端渲染时记录 layout 或页面的数据，返回转换成 JSON 值的数据，`isJSON` 表示已经转换过，
 * 客户端直接返回
 */
export function setSSRData(path: string, tag: string, data: unknown, isJSON = false) {
  if (!isServer) return data;
  const json = isJSON ? data : toJSONValue(data);
  ssrData.current ||= { path, data: {} };
  ssrData.current.data[tag] = json;
  return json;
}

/** 服务端渲染时页面的数据和标题已经确定，可以开始输出文档 */
export function setSSRReady() {
  if (isServer) ssrData.ready = true;
}

/** 服务端渲染时路由出错，响应使用它的状态码，水合时直接渲染错误页面 */
export function setSSRError(path: string, err: RouteError) {
  if (!isServer) return;
  requestState.error ||= err;
  ssrData.current ||= { path, data: {} };
  ssrData.current.error ||= err;
}

/**
 * 转换成错误页面的数据，意外的错误状态码为 500，生产环境隐藏错误信息，
 * 服务端交给 `handleError`，预渲染时抛出，避免把错误页面当作页面输出
 */
export function toErrorData(err: unknown): ErrorData {
  if (err instanceof HttpError) {
    const { status, message, issues } = err;
    return issues ? { status, message, issues } : { status, message };
  }
  if (isServer) {
    if (!requestState.request) throw err;
    errorHandler(err, getRequestEvent());
  } else {
    console.error(err);
  }
  const message = process.env.NODE_ENV === 'production' ? 'Internal Error' : String((err as Error)?.message ?? err);
  return { status: 500, message };
}

/** 转换成出错的路由，`Redirect` 不是错误，直接抛出 */
export function toRouteError(tag: string, err: unknown): RouteError {
  if (err instanceof Redirect) throw err;
  return { tag, ...toErrorData(err) };
}

/** 转换成 JSON 值，保证客户端拿到的数据和服务端一致 */
export function toJSONValue(value: unknown) {
  const json = JSON.stringify(value);
  return json === undefined ? null : JSON.parse(json);
}

/**
 * 当前请求的 `RequestEvent`，`url` 和 `path` 在执行 `handle` 前设置，
 * `hint` 是预渲染时读取 `request` 和 `cookies` 的错误提示，`extra` 是额外的字段
 */
function createRequestEvent<T extends object>(hint: string, extra: T): RequestEvent & T {
  const { url, path, locals } = requestState;
  if (!url) throw new Error('gemkit: `getRequestEvent` can only be called in a server request');
  const get = <K extends 'request' | 'cookies'>(key: K) => {
    // 预渲染时也标记，`handle` 读取时不预渲染
    requestState.personal = true;
    const value = requestState[key];
    if (!value) throw new Error(`gemkit: \`${key}\` is not available when prerendering, ${hint}`);
    return value as NonNullable<(typeof requestState)[K]>;
  };
  return {
    ...extra,
    url,
    path: path!,
    locals: locals!,
    platform: requestState.platform,
    get request() {
      return get('request');
    },
    get cookies() {
      return get('cookies');
    },
  };
}

/** 服务端模块的 `load`、`actions` 和 API 路由处理函数的参数 */
export function createServerContext(tag: string, params: Params): ServerLoadContext {
  return createRequestEvent(`export \`prerender = false\` (${tag})`, { params });
}

/**
 * 当前请求，`src/app.server.ts` 的 `handle` 的参数，纯服务端元素可以使用它读取请求、cookie 和 `locals`，
 * 只能在服务端的请求中调用
 */
export function getRequestEvent() {
  return createRequestEvent('export `prerender = false`', {});
}

/** 执行服务端模块的 `load`，跳转时记录到 `requestState`，渲染以这个错误结束 */
export async function runServerLoad(tag: string, params: Params) {
  const mod = await getServerModule(tag);
  try {
    return toJSONValue(await mod?.load?.(createServerContext(tag, params)));
  } catch (err) {
    if (err instanceof Redirect) requestState.redirect ||= err;
    throw err;
  }
}

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

// 最多缓存的历史记录数量
const HISTORY_CACHE_SIZE = 50;

/** 历史记录离开时的状态，`data` 是 layout 和页面的数据，key 是标签名，`elements` 是纯服务端元素的 HTML */
type HistoryEntry = { data: RouteData; elements: Record<string, string> };

// 前进后退时恢复历史记录离开时的状态，不再请求，key 是历史记录的 key，导航到新的历史记录时总是重新请求
const historyCache = new Map<string, HistoryEntry>();

/** 历史记录的缓存，默认是当前的历史记录 */
export const getHistoryEntry = (key = history.currentKey) => historyCache.get(key);

/** 更新历史记录的缓存，`key` 是开始加载时的历史记录，加载期间可能已经导航，只保留最近更新的历史记录 */
function updateHistoryEntry(key: string, update: (entry: HistoryEntry) => void) {
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
const getFileUrl = (path: string, search: string, file?: string) => history.basePath + getDataPath(path, file) + search;

/** 路由的 `key`，改变时重新渲染所有路由 */
export const outletStore = createStore({ key: 0 });

/**
 * 客户端导航状态，从开始加载 layout 或页面到页面加载完成（或者渲染错误页面），
 * 包括提交表单和 `invalidate()` 后的重新加载，用来显示进度条等
 *
 * @example
 * ```ts
 * @connectStore(navigationStore)
 * class MyLayoutElement extends GemElement {
 *   @template()
 *   #content = () => html`<progress v-if=${navigationStore.pending}></progress><gemkit-outlet></gemkit-outlet>`;
 * }
 * ```
 */
export const navigationStore = createStore({ pending: false });

/**
 * 客户端在提交表单或者 `invalidate()` 后需要重新加载数据，layout 不再复用数据，加载页面后重置
 *
 * `error` 是需要渲染错误页面的路由，例如 action 出错，`path` 是出错的页面路径
 */
export const clientState: { invalidated: boolean; error?: RouteError & { path: string } } = { invalidated: false };

/**
 * 路由在加载前就确定的错误，渲染错误页面：服务端是 `handle` 和 action 的错误，
 * 客户端是服务端渲染时的错误（水合时）和 action 的错误，只使用一次
 */
export function takeRouteError(path: string, tag: string) {
  let err: RouteError | undefined;
  if (isServer) {
    err = requestState.error;
  } else if (clientState.error?.path === path) {
    err = clientState.error;
  } else if (getSSRResult()?.path === path) {
    err = ssrResult!.error;
  }
  if (err?.tag !== tag) return;
  if (!isServer) {
    delete clientState.error;
    if (ssrResult) delete ssrResult.error;
  }
  return new HttpError(err.status, err.message);
}

/** 客户端跳转到 `href`，语言（`basePath`）不同时重新加载页面，和当前地址相同时重新渲染路由 */
export function navigate(href: string, replace = false) {
  const { origin, pathname, search, hash } = new URL(href, location.href);
  const { basePath } = history;
  if (origin !== location.origin || (basePath && pathname !== basePath && !pathname.startsWith(`${basePath}/`))) {
    location.assign(href);
    return;
  }
  const path = pathname.slice(basePath.length) || '/';
  const current = history.getParams();
  // `QueryString` 的字符串包含 `?`，统一成 `URLSearchParams` 再比较
  if (path === current.path && String(new URLSearchParams(search)) === String(new URLSearchParams(current.query))) {
    outletStore({ key: outletStore.key + 1 });
  } else {
    history[replace ? 'replace' : 'push']({ path, query: search, hash });
  }
}

// 同一次导航中 layout 和页面共用一个数据请求，再次使用时重新请求
let dataRequest: { url: string; promise: Promise<RouteDataFile>; taken: Set<string> } | undefined;

/** 获取页面的数据文件，静态托管时没有预渲染的页面没有数据文件，和没有匹配的路由一样是 404 */
export async function fetchData(url: string, path: string): Promise<RouteDataFile> {
  const res = await fetch(url);
  if (res.status === 404) notFound();
  if (!res.ok) throw new Error(`gemkit: failed to load data of \`${path}\``);
  const file: DataFile = await res.json();
  // 服务端 `load` 中的跳转，预取时不跳转，使用数据时再跳转
  if ('redirect' in file) throw new Redirect(302, file.redirect);
  return file;
}

/** 预取页面的服务端数据 */
export function prefetchServerData(path: string, search: string) {
  const url = getFileUrl(path, search);
  prefetchRequest(url, () => fetchData(url, path));
}

/** 加载 `*.server.ts` 的数据，客户端导航时通过数据文件获取 */
export async function loadServerData(tag: string, params: Params) {
  if (isServer) return runServerLoad(tag, params);
  const { path } = history.getParams();
  const url = getFileUrl(path, location.search);
  if (dataRequest?.url !== url || dataRequest.taken.has(tag)) {
    const promise = (takePrefetched<RouteDataFile>(url) || fetchData(url, path)).catch((err) => {
      // 替换当前导航，中断当前路由的渲染，layout 和页面共用请求，只跳转一次
      if (err instanceof Redirect) navigate(err.location, true);
      throw err;
    });
    dataRequest = { url, promise, taken: new Set() };
  }
  dataRequest.taken.add(tag);
  const { data, error } = await dataRequest.promise;
  if (error?.tag === tag) throw new HttpError(error.status, error.message);
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
      // `handle` 中的跳转，例如没有登录
      const redirectTo = res.headers.get(REDIRECT_HEADER);
      if (redirectTo) {
        navigate(redirectTo, true);
        throw new Redirect(302, redirectTo);
      }
      return res.json();
    });
    renderBatch = batch;
  }
  const index = renderBatch.elements.push(element) - 1;
  return renderBatch.promise.then((list) => list[index]);
}

const fetchElements = (url: string): Promise<Record<string, string>> =>
  fetch(url).then((res) => (res.ok ? res.json() : {}));

// 预渲染时才有页面中纯服务端元素的 HTML 文件，在构建时确定
const hasElementsFile = process.env.GEMKIT_PRERENDER !== 'false';

/** 预取页面中纯服务端元素的 HTML */
export function prefetchElements(path: string, search: string) {
  if (!hasElementsFile) return;
  const url = getFileUrl(path, search, ELEMENTS_FILE);
  prefetchRequest(url, () => fetchElements(url));
}

/** 获取当前页面中纯服务端元素的 HTML，导航时调用可以和页面模块、数据并行，没有预渲染时为空 */
export function loadPageElements() {
  if (!hasElementsFile) return Promise.resolve({} as Record<string, string>);
  const url = getFileUrl(history.getParams().path, location.search, ELEMENTS_FILE);
  if (elementsRequest?.url !== url) elementsRequest = { url, promise: takePrefetched(url) || fetchElements(url) };
  return elementsRequest.promise;
}

/**
 * 客户端创建纯服务端元素或者延时视图元素时获取 HTML，先从预渲染的 `__elements.json` 中获取，
 * 没有时（例如没有预渲染或者交互后才出现的元素）请求服务端渲染，静态托管时不可用
 */
export async function loadServerElement(
  key: string,
  tag: string,
  attrs: ServerElementParams['attrs'],
  props: ServerElementParams['props'],
) {
  const historyKey = history.currentKey;
  // 前进后退时使用离开时的 HTML
  const cached = getHistoryEntry(historyKey)?.elements[key];
  if (cached !== undefined) return cached;
  const pageUrl = history.basePath + history.getParams().path + location.search;
  const html = (await loadPageElements())[key] ?? (await renderElement(pageUrl, { tag, attrs, props }));
  updateHistoryEntry(historyKey, (entry) => {
    entry.elements[key] = html;
  });
  return html;
}

/** 预取的结果和历史缓存都不再使用，layout 也重新加载数据，例如修改数据或者登录后 */
export function clearClientCache() {
  clientState.invalidated = true;
  prefetched.clear();
  historyCache.clear();
}

// `invalidate()` 和 `submitAction()` 等待导航的页面渲染
let navigation: PromiseWithResolvers<void> | undefined;

/** 页面（或者错误页面）渲染后调用，没有错误页面时用加载的错误 reject */
export function settleNavigation(err?: unknown) {
  if (err) navigation?.reject(err);
  else navigation?.resolve();
  navigation = undefined;
}

/** 客户端导航到 `href`，页面渲染后 resolve */
function navigateAndWait(href: string, replace?: boolean) {
  navigation ||= Promise.withResolvers();
  const { promise } = navigation;
  navigate(href, replace);
  return promise;
}

/**
 * 重新加载当前页面和 layout 的数据，不刷新页面，页面元素会被复用，例如调用 API 修改数据后，
 * 预取的结果和历史缓存都不再使用，页面渲染后 resolve，没有错误页面时加载出错 reject
 *
 * @example
 * ```ts
 * await apis.api.likes(slug).POST({ count: 1 });
 * await invalidate();
 * ```
 */
export function invalidate() {
  clearClientCache();
  return navigateAndWait(location.href, true);
}

/** `actions` 的结果，出错时渲染错误页面 */
export type ActionResult =
  | { type: 'success'; data: unknown }
  | { type: 'redirect'; location: string }
  | { type: 'error'; error: RouteError };

/**
 * 不刷新页面提交表单到 `actions`，提交的地址是表单（或者 `submitter`）的 `action`，例如 `?/login`
 *
 * 跳转时客户端导航，出错时渲染错误页面，否则重新加载当前页面的数据，页面渲染后返回 action 的返回值，
 * 请求期间表单有 `aria-busy` 属性，例如 `form[aria-busy] button { opacity: 0.5 }`
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
  form.ariaBusy = 'true';
  const res = await fetch(action, {
    method: 'POST',
    headers: { accept: 'application/json' },
    body: new FormData(form, submitter),
  }).finally(() => (form.ariaBusy = null));
  if (!res.ok) throw new Error(`gemkit: failed to submit \`${action}\``);
  const result: ActionResult = await res.json();
  // 提交后 cookie 等状态可能改变，之前的数据都不能再使用
  clearClientCache();
  if (result.type === 'redirect') {
    await navigateAndWait(result.location);
    return;
  }
  if (result.type === 'error') clientState.error = { ...result.error, path: history.getParams().path };
  await navigateAndWait(location.href, true);
  return result.type === 'success' ? result.data : undefined;
}

/** `formActions` 的 action，参数是提交后的回调，返回值作为表单的剩余属性 */
export type FormActions<A> = {
  [K in keyof A & string]: (
    callback?: (
      data: (A[K] extends (...args: any) => infer R ? Awaited<R> : never) | undefined,
      form: HTMLFormElement,
    ) => void,
  ) => { method: 'post'; action: string; onsubmit: (evt: SubmitEvent) => void };
};

/**
 * 使用 `*.server.ts` 中 `actions` 的类型，得到表单的剩余属性，提交时调用 `submitAction`，
 * 回调的参数是 action 的结果（跳转或者出错时是 `undefined`）和表单
 *
 * @example
 * ```ts
 * import type { actions } from './login.server';
 *
 * const { login } = formActions<typeof actions>();
 *
 * html`<form ${login((data) => this.#state({ errors: data?.errors }))}></form>`;
 * ```
 */
export function formActions<A>() {
  return new Proxy({} as FormActions<A>, {
    get: (_, name: string) => (callback?: (data: unknown, form: HTMLFormElement) => void) => ({
      method: 'post',
      action: `?/${name}`,
      onsubmit: async (evt: SubmitEvent) => {
        evt.preventDefault();
        const form = evt.target as HTMLFormElement;
        callback?.(await submitAction(form, evt.submitter), form);
      },
    }),
  });
}

let revalidateHandler: ((pathname: string) => unknown) | undefined;

/** `gemkit start` 设置，清除 ISR 的缓存 */
export function setRevalidateHandler(handler: typeof revalidateHandler) {
  revalidateHandler = handler;
}

/**
 * 在服务端清除页面（`revalidate`）的 ISR 缓存，下次请求时重新渲染，`pathname` 包含语言前缀，
 * 例如在 webhook 或者修改数据的 API 路由中调用；开发时和静态托管时没有缓存
 */
export async function revalidatePath(pathname: string) {
  await revalidateHandler?.(pathname);
}
