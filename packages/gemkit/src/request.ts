// 服务端请求的状态和渲染数据；客户端也调用其中一些函数，内部判断服务端，只在服务端使用的代码才能在客户端构建时移除

import { history } from '@mantou/gem';
import { isolate, isServer } from '@mantou/gem/lib/server';

import { type ErrorData, HttpError, Redirect, type RouteError } from './error';
import type { Params } from './page';
import type {
  AppClientModule,
  AppServerModule,
  Cookies,
  Locals,
  Platform,
  RequestEvent,
  RouteData,
  ServerLoadContext,
  ServerModules,
  StandardSchemaV1,
} from './types';

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

// 页面和 layout 的标签名对应的服务端模块
let serverModules: ServerModules = {};

export function setServerModules(modules: ServerModules) {
  serverModules = modules;
}

export function getServerModule(tag: string) {
  return serverModules[tag]?.();
}

const logError = (err: unknown) => console.error(err);

let errorHandler: NonNullable<AppServerModule['handleError']> = logError;

export function setErrorHandler(handler: AppServerModule['handleError']) {
  errorHandler = handler || logError;
}

let clientErrorHandler: NonNullable<AppClientModule['handleError']> = logError;

export function setClientErrorHandler(handler: AppClientModule['handleError']) {
  clientErrorHandler = handler || logError;
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
  /** `cookies` 设置的 `Set-Cookie` */
  setCookies?: string[];
  /** `setHeaders` 设置的响应头 */
  headers?: Headers;
  /** 渲染外壳页面，所有路由都由客户端渲染，有 `ssr = false` 的路由时作为静态托管的后备页面 */
  shell?: boolean;
}>({});

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
 * 交给 `src/app.server.ts` 或者 `src/app.client.ts` 的 `handleError`，预渲染时抛出，避免把错误页面当作页面输出
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
    clientErrorHandler(err, { url: new URL(location.href), path: history.getParams().path });
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
    setHeaders: (headers) => {
      for (const [name, value] of Object.entries(headers)) {
        if (name.toLowerCase() === 'set-cookie') throw new Error('gemkit: use `cookies.set` to set cookies');
        requestState.headers!.set(name, value);
      }
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
