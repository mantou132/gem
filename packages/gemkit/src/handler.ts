import path from 'node:path';

import { DATA_FILE, ELEMENT_PATH, ELEMENTS_FILE, escapeHtml, getDataPath, trimTrailingSlash } from './constants';
import type { DataFile, RouteError } from './data';
import type { Renderer } from './server';

/** 页面数据和页面中纯服务端元素的请求 */
export const isDataRequest = (pathname: string) =>
  pathname.endsWith(`/${DATA_FILE}`) || pathname.endsWith(`/${ELEMENTS_FILE}`);

/**
 * 带查询参数的页面和数据请求不使用预渲染的文件，`load` 的结果可能和预渲染时不同，
 * 例如读取了 `url.searchParams`；其他文件（例如 `app.js?v=1`）不受影响
 */
export const isQueryRequest = ({ pathname, search }: URL) =>
  !!search && (isDataRequest(pathname) || !path.extname(pathname));

/** 表单提交到页面的 `actions`，地址是 `<page path>?/<name>`，有的平台（例如 Vercel）会把 `/` 编码成 `%2F` */
export const isActionRequest = (method: string, search: string) => method === 'POST' && /^\?(\/|%2F)/i.test(search);

/** 平台提供的请求上下文，serverless 平台在响应后需要 `waitUntil` 才能继续执行后台任务 */
export interface PlatformContext {
  waitUntil?: (promise: Promise<unknown>) => void;
}

export type Handler = ((request: Request, platform?: PlatformContext) => Promise<Response>) & {
  /** 路径匹配 API 路由，开发服务器用来判断是否处理请求 */
  isEndpoint: (pathname: string) => boolean;
};

/** ISR 的存储，key 是页面或者数据文件的路径，例如 `/blog/index.html`、`/blog/__data.json` */
export interface IsrStore {
  /** 内容和写入时间（毫秒），没有时为 `undefined` */
  get(file: string): Promise<{ content: string; time: number } | undefined>;
  set(files: Map<string, string>): Promise<unknown>;
  delete(files: string[]): Promise<unknown>;
}

export interface HandlerOptions {
  /** 读取预渲染的文件，没有时为 `undefined`；平台优先提供静态文件时不需要 */
  readStatic?: (file: string) => Promise<string | undefined>;
  /** 设置了 `revalidate` 的页面渲染后保存在这里 */
  isrStore?: IsrStore;
  /**
   * 设置了 `revalidate` 的页面由平台的 CDN 缓存，返回 CDN 缓存的响应头，
   * CDN 需要支持 `stale-while-revalidate`，代替 `isrStore`
   */
  cdnCache?: (revalidate: number) => [name: string, value: string];
  /**
   * 网站的 origin，例如 `https://example.com`，部署在反向代理后面时设置，
   * 否则使用 `Host` 请求头和连接的协议，`load` 中的 `url`、cookie 的 `Secure` 和同源检查都使用它
   */
  origin?: string;
}

/** 浏览器可以跨站直接提交（不需要预检）的请求体类型，API 路由拒绝这些跨站请求 */
const FORM_TYPES = ['application/x-www-form-urlencoded', 'multipart/form-data', 'text/plain'];

const isFormRequest = (request: Request) => {
  if (request.method === 'GET' || request.method === 'HEAD') return false;
  const type = request.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
  return !!type && FORM_TYPES.includes(type);
};

const HTML_TYPE = 'text/html; charset=utf-8';

const encoder = new TextEncoder();

/** 流式输出 HTML，直接编码，`TextEncoderStream` 多一层 TransformStream 开销较大 */
const toStream = (html: AsyncIterator<string>) =>
  new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await html.next();
      if (done) controller.close();
      else controller.enqueue(encoder.encode(value));
    },
  });

/**
 * 其他网站提交的表单或者纯服务端元素的请求（CSRF），优先使用浏览器的 `Sec-Fetch-Site`，
 * 反向代理后请求 URL 的协议可能和浏览器中的不同，所以只比较 `Origin` 的 host
 */
function isCrossSite(request: Request, url: URL) {
  const site = request.headers.get('sec-fetch-site');
  if (site) return site !== 'same-origin';
  const origin = request.headers.get('origin');
  return !!origin && new URL(origin).host !== url.host;
}

/** 请求的 `Host` 请求头和连接的协议不可信，例如反向代理后面的协议总是 `http:`，使用配置的 origin */
export function withOrigin(request: Request, origin: string) {
  const { pathname, search } = new URL(request.url);
  return new Request(`${origin}${pathname}${search}`, request);
}

/** 请求的页面路径和对应的文件，例如 `/blog/__data.json` 是 `/blog` 和 `/blog/__data.json` */
export function getPageFile(pathname: string) {
  if (!isDataRequest(pathname)) {
    const page = trimTrailingSlash(pathname);
    return { page, file: path.posix.join(page, 'index.html') };
  }
  return { page: pathname.slice(0, pathname.lastIndexOf('/')) || '/', file: pathname };
}

function getRedirectHtml(location: string) {
  const url = escapeHtml(location);
  return `<!doctype html><meta charset="utf-8"><title>Redirecting</title><meta http-equiv="refresh" content="0; url=${url}"><link rel="canonical" href="${url}">\n`;
}

/**
 * 预渲染页面，返回状态码和需要写入的文件（路径和内容），构建时和 ISR 使用
 *
 * 静态托管不能响应跳转，页面使用 `<meta>` 跳转，客户端导航时从数据文件中读取跳转地址
 */
export async function prerenderPage(renderer: Renderer, template: string, pathname: string) {
  const serverElements = new Map<string, string>();
  const result = await renderer.renderDocument(template, pathname, { serverElements });
  const files = new Map<string, string>();
  const location = result.headers.get('location');
  if (location) {
    files.set(path.posix.join(pathname, 'index.html'), getRedirectHtml(location));
    files.set(getDataPath(pathname), JSON.stringify({ redirect: location } satisfies DataFile));
    return { status: result.status, files };
  }
  files.set(path.posix.join(pathname, 'index.html'), (await Array.fromAsync(result.html)).join(''));
  // 客户端导航时使用的纯服务端元素，导航时总会请求，没有元素时也输出
  files.set(getDataPath(pathname, ELEMENTS_FILE), JSON.stringify(Object.fromEntries(serverElements)));
  // 客户端导航时使用的数据
  if (renderer.hasServerData(pathname)) {
    const dataPath = getDataPath(pathname);
    files.set(dataPath, JSON.stringify((await renderer.loadData(dataPath)).body));
  }
  return { status: result.status, files };
}

/**
 * 增量静态再生成（ISR）：设置了 `revalidate` 的页面第一次请求时预渲染并保存到 `store`，
 * 过期后先返回旧内容，在后台重新渲染，同一个页面同时只渲染一次；
 * 和预渲染的条件一样，渲染结果不是 200 时（例如跳转、出错）不缓存，由服务端渲染
 */
function createIsr(renderer: Renderer, template: string, store: IsrStore) {
  const pending = new Map<string, Promise<Map<string, string> | undefined>>();
  const regenerate = (page: string) => {
    let promise = pending.get(page);
    if (!promise) {
      promise = (async () => {
        const { status, files } = await prerenderPage(renderer, template, page);
        if (status !== 200) return;
        await store.set(files);
        return files;
      })().finally(() => pending.delete(page));
      pending.set(page, promise);
    }
    return promise;
  };
  renderer.setRevalidateHandler((page) =>
    store.delete([path.posix.join(page, 'index.html'), getDataPath(page), getDataPath(page, ELEMENTS_FILE)]),
  );
  /** 页面或者数据文件的内容，页面不使用 ISR 或者不能缓存时为 `undefined` */
  return async (pathname: string, platform?: PlatformContext) => {
    const { page, file } = getPageFile(pathname);
    const revalidate = await renderer.getRevalidate(page);
    if (revalidate === undefined) return;
    const cached = await store.get(file);
    if (!cached) {
      // 渲染出错时由服务端渲染错误页面，并交给 `handleError`
      if (!(await renderer.canPrerender(page))) return;
      return (await regenerate(page).catch(() => undefined))?.get(file);
    }
    // 先返回旧内容再在后台重新渲染
    if (Date.now() - cached.time > revalidate * 1000) {
      const task = regenerate(page).catch((err) => console.error(err));
      platform?.waitUntil?.(task);
    }
    return cached.content;
  };
}

/** 处理页面、页面数据、表单提交、纯服务端元素和 API 路由请求，提供 `readStatic` 时优先使用预渲染的文件 */
export function createFetchHandler(
  renderer: Renderer,
  template: string,
  { readStatic, isrStore, cdnCache, origin }: HandlerOptions = {},
): Handler {
  const trustedOrigin = origin && new URL(origin).origin;
  const readIsr = isrStore ? createIsr(renderer, template, isrStore) : undefined;
  // 带查询参数的请求不使用预渲染和 ISR 的文件
  const readPrerendered = async (url: URL, platform?: PlatformContext) => {
    if (isQueryRequest(url)) return;
    return (await readStatic?.(getPageFile(url.pathname).file)) || readIsr?.(url.pathname, platform);
  };
  // 共享缓存不能缓存因人而异的响应（设置了 `Cache-Control: private`）
  const setCdnCache = async ({ pathname }: URL, response: Response) => {
    if (!cdnCache || response.status !== 200 || response.headers.has('cache-control')) return response;
    const revalidate = await renderer.getRevalidate(getPageFile(pathname).page);
    if (revalidate !== undefined) response.headers.set(...cdnCache(revalidate));
    return response;
  };
  const renderHtml = async (request: Request, error?: RouteError) => {
    const { status, headers, html } = await renderer.renderDocument(template, request, { error });
    headers.set('content-type', HTML_TYPE);
    return new Response(toStream(html), { status, headers });
  };
  const handler = async (input: Request, platform?: PlatformContext) => {
    const request = trustedOrigin ? withOrigin(input, trustedOrigin) : input;
    const url = new URL(request.url);
    const { pathname } = url;
    if (pathname === ELEMENT_PATH) {
      if (isCrossSite(request, url)) return new Response(null, { status: 403 });
      const { status, headers, html } = await renderer.renderElements(request);
      return Response.json(html, { status, headers });
    }
    if (renderer.matchEndpoint(pathname)) {
      // 跨站的 JSON 请求需要预检，由 CORS 限制，没有 `Origin` 的请求（例如 webhook）不受影响
      if (isFormRequest(request) && isCrossSite(request, url)) return new Response(null, { status: 403 });
      return renderer.runEndpoint(request);
    }
    if (isActionRequest(request.method, url.search)) {
      if (isCrossSite(request, url)) return new Response(null, { status: 403 });
      const { headers, result } = await renderer.runAction(request);
      if (!result) return new Response(null, { status: 404, headers });
      // `submitAction` 提交时返回结果，原生表单提交时跳转到 `redirect` 的地址或者当前页面，出错时渲染错误页面
      if (request.headers.get('accept') === 'application/json') return Response.json(result, { headers });
      if (result.type === 'error') {
        const page = await renderHtml(request, result.error);
        for (const cookie of headers.getSetCookie()) page.headers.append('set-cookie', cookie);
        return page;
      }
      headers.set('location', result.type === 'redirect' ? result.location : pathname);
      return new Response(null, { status: 303, headers });
    }
    if (isDataRequest(pathname)) {
      const body = await readPrerendered(url, platform);
      if (body) return new Response(body, { headers: { 'content-type': 'application/json' } });
      // 没有预渲染的页面客户端使用 `ELEMENT_PATH` 渲染，开启预渲染时导航总会请求，避免 404
      if (pathname.endsWith(ELEMENTS_FILE)) return setCdnCache(url, Response.json({}));
      const { status, headers, body: file } = await renderer.loadData(request);
      return setCdnCache(url, Response.json(file, { status, headers }));
    }
    const body = await readPrerendered(url, platform);
    if (body) return new Response(body, { headers: { 'content-type': HTML_TYPE } });
    return setCdnCache(url, await renderHtml(request));
  };
  return Object.assign(handler, { isEndpoint: (pathname: string) => !!renderer.matchEndpoint(pathname) });
}
