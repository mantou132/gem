// 必须在 Gem 之前执行，用来模拟 DOM 环境
import '@mantou/gem-ssr';

import { history, type TemplateResult, titleStore } from '@mantou/gem';
import type { I18n } from '@mantou/gem/helper/i18n';
import { type RenderOptions, render, renderServerElement, runInRequest } from '@mantou/gem-ssr';

import { DATA_FILE, DATA_SCRIPT_ID, REDIRECT_HEADER, trimTrailingSlash } from './constants';
import { createCookies } from './cookies';
import {
  type ActionResult,
  type AppServerModule,
  createServerContext,
  type DataFile,
  getRequestEvent,
  getServerModule,
  NotFound,
  Redirect,
  type RouteData,
  requestState,
  runServerLoad,
  type ServerElementParams,
  type ServerModule,
  setServerModules,
  ssrData,
  toJSONValue,
} from './data';
import { getBasePath, localizePath, splitLanguage } from './i18n';
import { getLayoutParams, getPageRoutes, matchPage, matchRoutes } from './outlet';
import { getPageOptions, type Params } from './page';
import { formatTitle, type TitleOptions } from './title';

export interface RendererOptions extends TitleOptions {
  /** 路由使用 `setOutlets` 设置的路由，和客户端一样匹配 */
  app: TemplateResult;
  /** 页面和 layout 标签名对应的 `*.server.ts` */
  serverModules?: Record<string, () => Promise<ServerModule>>;
  /** `src/app.server.ts` */
  appServerModule?: AppServerModule;
  i18n?: I18n<any>;
  languages?: string[];
  defaultLanguage?: string;
  /** 默认语言也使用路径前缀，没有前缀的路径跳转到默认语言 */
  prefixDefaultLanguage?: boolean;
}

export interface RenderResult {
  status: number;
  /** `handle` 和 `load` 设置的 cookie 和跳转的地址 */
  headers: Headers;
  /** 页面的数据和标题确定后才开始输出，之后的异步内容（例如 `@server`）流式输出，跳转时没有内容 */
  html: AsyncGenerator<string>;
}

const escapeHtml = (s: string) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');

/** 设置的 cookie 添加到响应头，因人而异的响应不能被 CDN 等共享缓存，在请求作用域中调用 */
function toHeaders(setCookies: string[], init?: HeadersInit) {
  const headers = new Headers(init);
  for (const cookie of setCookies) headers.append('set-cookie', cookie);
  if (requestState.personal || setCookies.length) headers.set('cache-control', 'private, no-store');
  return headers;
}

function fillPattern(pattern: string, params: Params) {
  return pattern
    .replace(/:([^/]+)/g, (_, name) => encodeURIComponent(params[name]))
    .replace('*', () => params['*'] ?? params[0] ?? '');
}

export function createRenderer({
  app,
  serverModules = {},
  appServerModule = {},
  i18n,
  languages = [],
  defaultLanguage = '',
  prefixDefaultLanguage = false,
  ...titleOptions
}: RendererOptions) {
  setServerModules(serverModules);

  /** 路径匹配的 layout 和页面（包括 404 页面）中有服务端模块的，以及它们的参数 */
  const findServerRoutes = (path: string) =>
    matchRoutes(path).flatMap(({ info, params }) =>
      info.server ? [{ tag: info.tag, params: info.layout ? getLayoutParams(params) : params }] : [],
    );

  /** 设置当前请求，返回请求的 URL 和请求中设置的 cookie，预渲染时 `input` 是路径，没有请求 */
  const setRequest = (input: Request | string) => {
    if (typeof input === 'string') return { url: new URL(input, 'http://localhost'), setCookies: [] };
    const { cookies, setCookies } = createCookies(input);
    requestState.request = input;
    requestState.cookies = cookies;
    return { url: new URL(input.url), setCookies };
  };

  const split = (pathname: string) => splitLanguage(pathname, languages, defaultLanguage, prefixDefaultLanguage);
  const localize = (lang: string, path: string) => localizePath(lang, path, defaultLanguage, prefixDefaultLanguage);

  const setLanguage = async (pathname: string) => {
    const { lang, path } = split(trimTrailingSlash(pathname));
    history.basePath = getBasePath(lang, defaultLanguage, prefixDefaultLanguage);
    await i18n?.setLanguage(lang);
    return { lang, path };
  };

  /** 执行 `src/app.server.ts` 的 `handle`，`url` 是页面的 URL，`path` 不包含语言前缀，跳转时抛出 `Redirect` */
  const handleRequest = async (url: URL, path: string) => {
    requestState.url = url;
    requestState.path = path;
    requestState.locals = {};
    await appServerModule.handle?.(getRequestEvent());
  };

  /**
   * 处理客户端导航时的数据请求，URL 是页面路径加上 `/__data.json`，预渲染时 `input` 是路径
   *
   * 返回数据文件的内容 `body`，其中有路径匹配的 layout 和页面的服务端数据，key 是标签名，
   * 客户端只在有服务端模块时请求，没有 `load`（例如只有 `actions`）时数据为空对象
   */
  const loadData = (input: Request | string) =>
    runInRequest(async (): Promise<{ status: number; headers: Headers; body: DataFile | null }> => {
      const { url, setCookies } = setRequest(input);
      const pagePathname = url.pathname.slice(0, -DATA_FILE.length - 1) || '/';
      const { path } = await setLanguage(pagePathname);
      const pageUrl = new URL(`${url.origin}${pagePathname}${url.search}`);
      const routes = findServerRoutes(path);
      const data: RouteData = {};
      // 调用了 `notFound()` 的路由，其他路由的数据仍然可以使用，例如 layout 的数据
      let notFoundTag: string | undefined;
      try {
        await handleRequest(pageUrl, path);
        if (!routes.length) return { status: 404, headers: toHeaders(setCookies), body: null };
        await Promise.all(
          routes.map(async ({ tag, params }) => {
            if (!(await getServerModule(tag))?.load) return;
            try {
              data[tag] = await runServerLoad(tag, params);
            } catch (err) {
              if (!(err instanceof NotFound)) throw err;
              notFoundTag = tag;
            }
          }),
        );
      } catch (err) {
        if (!(err instanceof Redirect)) throw err;
        return { status: 200, headers: toHeaders(setCookies), body: { redirect: err.location } };
      }
      return { status: 200, headers: toHeaders(setCookies), body: { data, notFound: notFoundTag } };
    });

  /** 处理页面的表单提交 `POST <page path>?/<name>`，没有对应的 action 时结果为 `null` */
  const runAction = (request: Request) =>
    runInRequest(async () => {
      const { url, setCookies } = setRequest(request);
      const name = [...url.searchParams.keys()].find((key) => key.startsWith('/'))?.slice(1);
      const { path } = await setLanguage(url.pathname);
      const matched = matchPage(path);
      const actions = matched && (await getServerModule(matched.info.tag))?.actions;
      if (name === undefined || !actions || !Object.hasOwn(actions, name)) {
        return { headers: toHeaders(setCookies), result: null };
      }
      let result: ActionResult;
      try {
        await handleRequest(url, path);
        const data = await actions[name](createServerContext(matched.info.tag, matched.params));
        result = { type: 'success', data: toJSONValue(data) };
      } catch (err) {
        if (!(err instanceof Redirect)) throw err;
        result = { type: 'redirect', location: err.location };
      }
      return { headers: toHeaders(setCookies), result };
    });

  /**
   * 渲染页面中的纯服务端元素，请求体是 `{ url, elements }`，`url` 是页面的路径，
   * 返回元素的 HTML，顺序和 `elements` 一致，跳转时为 `null`，响应头中有跳转的地址
   */
  const renderElements = (request: Request) =>
    runInRequest(async () => {
      const { url, setCookies } = setRequest(request);
      const body: { url: string; elements: ServerElementParams[] } = await request.json();
      const { pathname, search } = new URL(body.url, url);
      const { path } = await setLanguage(pathname);
      try {
        await handleRequest(new URL(`${url.origin}${pathname}${search}`), path);
      } catch (err) {
        if (!(err instanceof Redirect)) throw err;
        return { headers: toHeaders(setCookies, { [REDIRECT_HEADER]: err.location }), html: null };
      }
      // 元素在页面和 layout 的模块中定义
      await Promise.all(matchRoutes(path).map(({ info }) => info.load()));
      const options = { url: `${url.origin}${path}${search}` };
      const html = await Promise.all(
        body.elements.map(({ tag, attrs, props }) => renderServerElement(tag, attrs, props, options)),
      );
      return { headers: toHeaders(setCookies), html };
    });

  /**
   * 将渲染结果插入 HTML 模版，模版中使用 `<!--gemkit-body-->` 标记内容位置
   *
   * 预渲染时 `input` 是路径，使用 `serverElements` 收集纯服务端元素的 HTML
   */
  const renderDocument = (
    template: string,
    input: Request | string,
    { serverElements }: Pick<RenderOptions, 'serverElements'> = {},
  ) =>
    // 每个请求有独立的 history、i18n、store 和 `requestState`
    runInRequest(async (): Promise<RenderResult> => {
      const { url, setCookies } = setRequest(input);
      const { lang, path } = await setLanguage(url.pathname);
      const redirectTo = ({ status, location }: Redirect) => ({
        status,
        headers: toHeaders(setCookies, { location }),
        html: (async function* () {})(),
      });
      // 所有语言都有前缀时，没有前缀的路径跳转到默认语言
      const localized = localize(lang, path);
      if (localized !== trimTrailingSlash(url.pathname)) return redirectTo(new Redirect(302, localized + url.search));
      // 调用 `render` 时立即开始渲染，需要先执行
      try {
        await handleRequest(url, path);
      } catch (err) {
        if (!(err instanceof Redirect)) throw err;
        return redirectTo(err);
      }
      // 客户端断开时中止渲染，预渲染时没有请求
      const signal = typeof input === 'string' ? undefined : input.signal;
      const chunks = render(app, { url: `${url.origin}${path}${url.search}`, serverElements, signal });
      // 页面的数据和标题确定后再输出文档
      let body = '';
      try {
        while (!ssrData.ready) {
          const { done, value } = await chunks.next();
          if (done) break;
          body += value;
        }
      } catch (err) {
        // 等待内容时 `load` 跳转，渲染以这个错误结束
        if (!requestState.redirect) throw err;
      }
      // 不再读取剩余的内容，中止渲染
      const { redirect } = requestState;
      if (redirect) {
        await chunks.return(undefined);
        return redirectTo(redirect);
      }
      // 避免内容中的 `</script>` 结束标签
      const dataScript = ssrData.current
        ? `<script type="application/json" id="${DATA_SCRIPT_ID}">${JSON.stringify(ssrData.current).replaceAll('<', '\\u003c')}</script>`
        : '';
      let html = template.replace(
        /<title>[\s\S]*?<\/title>/,
        () => `<title>${escapeHtml(formatTitle(titleStore.title, titleOptions))}</title>`,
      );
      if (lang) {
        html = html.replace(
          /<html([^>]*)>/,
          (_, attrs: string) => `<html${attrs.replace(/\s+lang="[^"]*"/, '')} lang="${lang}">`,
        );
      }
      const [start, end] = html.split('<!--gemkit-body-->');
      return {
        status: matchPage(path) && !requestState.notFound ? 200 : 404,
        headers: toHeaders(setCookies),
        html: (async function* () {
          yield start + body;
          yield* chunks;
          yield dataScript + end;
        })(),
      };
    });

  /**
   * 路径匹配的 layout 和页面的服务端模块都没有设置 `prerender = false`，
   * 并且 `handle` 没有读取 `request`、`cookies`，也没有跳转，例如需要登录的页面
   */
  const canPrerender = (pathname: string) =>
    runInRequest(async () => {
      const { path } = split(pathname);
      const modules = await Promise.all(findServerRoutes(path).map(({ tag }) => getServerModule(tag)));
      if (modules.some((mod) => mod?.prerender === false)) return false;
      try {
        await handleRequest(new URL(pathname, 'http://localhost'), path);
      } catch (err) {
        // 预渲染时读取 `cookies` 会报错
        if (!(err instanceof Redirect) && !requestState.personal) throw err;
        return false;
      }
      return !requestState.personal;
    });

  /** 需要预渲染的路径，动态路由使用 `*.server.ts` 或者页面的 `paths` 选项 */
  const getPaths = async () => {
    const localized: string[] = [];
    // 每个语言的动态路由参数可能不同，例如某些文章没有翻译
    for (const lang of languages.length ? languages : [defaultLanguage]) {
      const paths: string[] = [];
      for (const { pattern, info } of getPageRoutes()) {
        if (!/[:*]/.test(pattern)) {
          paths.push(pattern);
          continue;
        }
        const getParams = (await getServerModule(info.tag))?.paths || getPageOptions((await info.load()).default).paths;
        for (const params of (await getParams?.({ lang })) || []) paths.push(fillPattern(pattern, params));
      }
      // `handle` 读取的 `url` 包含语言前缀，每个语言的路径分别判断
      localized.push(...(languages.length ? paths.map((path) => localize(lang, path)) : paths));
      // 没有前缀的路径输出跳转页面，静态托管时也能跳转到默认语言
      if (prefixDefaultLanguage && lang === defaultLanguage) localized.push(...paths);
    }
    const allowed = await Promise.all(localized.map(canPrerender));
    return localized.filter((_, index) => allowed[index]);
  };

  /** 页面或 layout 是否有服务端数据，预渲染时需要输出数据文件 */
  const hasServerData = (path: string) => findServerRoutes(split(path).path).length > 0;

  /** 预渲染 404 页面时使用的路径，使用默认语言 */
  const notFoundPath = localize(defaultLanguage, '/__gemkit_404__');

  return { renderDocument, loadData, runAction, renderElements, getPaths, canPrerender, hasServerData, notFoundPath };
}

export type Renderer = ReturnType<typeof createRenderer>;
