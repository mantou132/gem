// 请求、部署平台、服务端模块和数据文件的类型

import type { ErrorData, RouteError } from './error';
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
  /**
   * 设置响应头，例如 `Cache-Control`、`Content-Security-Policy`，同名的覆盖之前设置的，
   * cookie 使用 `cookies`；和 cookie 一样，文档开始流式输出之后设置的会被忽略，预渲染的文件没有响应头
   */
  setHeaders: (headers: Record<string, string>) => void;
}

export interface ServerLoadContext<P extends Params = Params> extends RequestEvent {
  params: P;
}

/**
 * 处理 Gemkit 渲染的每个请求：页面、页面数据、表单提交、API 路由和纯服务端元素，
 * `resolve()` 生成 Gemkit 的响应，返回它或者修改后的响应，也可以不调用 `resolve()` 直接返回其他响应
 *
 * 调用 `resolve()` 之前可以使用 `redirect`、`error`，和在 `load` 中一样，由请求的类型决定响应，
 * 例如页面渲染错误页面、数据文件中包含跳转地址
 */
export type Handle = (event: RequestEvent, resolve: () => Promise<Response>) => Response | Promise<Response>;

/** `src/app.server.ts` 导出的内容，只在服务端执行 */
export interface AppServerModule {
  /**
   * 见 `Handle`，使用 `locals` 传递数据
   *
   * 预渲染时也执行，读取了 `request`、`cookies`，或者在 `resolve()` 之前跳转、出错的路径不预渲染
   */
  handle?: Handle;
  /**
   * `handle`、`load`、`actions`、API 路由中抛出的非 `error()` 错误，用来记录日志或者上报，默认使用 `console.error`，
   * 页面显示状态码 500，生产环境不显示错误信息
   */
  handleError?: (error: unknown, event: RequestEvent) => unknown;
}

/** `src/app.client.ts` 导出的内容，只在客户端执行 */
export interface AppClientModule {
  /**
   * 客户端导航时 `load`、加载页面模块或数据等抛出的非 `error()` 错误，用来上报，默认使用 `console.error`；
   * Gemkit 捕获这些错误并渲染错误页面，它们不会出现在 `window` 的 `error` 事件中。
   * `url` 是页面的 URL，`path` 不包含语言前缀
   */
  handleError?: (error: unknown, event: Pick<RequestEvent, 'url' | 'path'>) => unknown;
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

/** `rest` 是 `[...rest]` 的参数名 */
export type Endpoints = { pattern: string; rest?: string; load: () => Promise<EndpointModule> }[];

/** 页面和 layout 的数据，key 是标签名 */
export type RouteData = Record<string, unknown>;

/**
 * 数据文件（`__data.json`）的内容，跳转时只有 `redirect`，`error` 是出错的路由，
 * `version` 是生成它的客户端构建的版本，开发时没有
 *
 * 静态托管时不能设置响应头，所以都放在内容中
 */
export type DataFile = (RouteDataFile | { redirect: string }) & { version?: string };

export type RouteDataFile = { data: RouteData; error?: RouteError };

/** 页面中纯服务端元素的 HTML 文件（`__elements.json`）的内容，key 是元素的 key */
export type ElementsFile = { elements: Record<string, string>; version?: string };

/** 服务端渲染元素（`ELEMENT_PATH`）的响应，`html` 的顺序和请求的元素一致，跳转或者 `handle` 出错时为 `null` */
export type ElementsResult = { html: string[] | null; version?: string };

/** 纯服务端元素的标签名、attribute 和 property */
export interface ServerElementParams {
  tag: string;
  attrs: Record<string, string>;
  props: Record<string, unknown>;
}

/** `actions` 的结果，出错时渲染错误页面 */
export type ActionResult =
  | { type: 'success'; data: unknown }
  | { type: 'redirect'; location: string }
  | { type: 'error'; error: RouteError };
