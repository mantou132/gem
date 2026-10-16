// 必须在 Gem 之前执行，用来模拟 DOM 环境
import '@mantou/gem-ssr';

import { history, type TemplateResult, titleStore } from '@mantou/gem';
import type { I18n } from '@mantou/gem/helper/i18n';
import { type RenderOptions, render, renderServerElement, runInRequest } from '@mantou/gem-ssr';

import { DATA_FILE, DATA_SCRIPT_ID, NOT_FOUND_HEADER, REDIRECT_HEADER, trimTrailingSlash } from './constants';
import { createCookies } from './cookies';
import {
  type ActionResult,
  createServerContext,
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
  i18n?: I18n<any>;
  languages?: string[];
  defaultLanguage?: string;
}

export interface RenderResult {
  status: number;
  /** `load` 设置的 cookie 和跳转的地址 */
  headers: Headers;
  /** 页面的数据和标题确定后才开始输出，之后的异步内容（例如 `@server`）流式输出，跳转时没有内容 */
  html: AsyncGenerator<string>;
}

const escapeHtml = (s: string) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');

/** 设置的 cookie 添加到响应头 */
function toHeaders(setCookies: string[], init?: HeadersInit) {
  const headers = new Headers(init);
  for (const cookie of setCookies) headers.append('set-cookie', cookie);
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
  i18n,
  languages = [],
  defaultLanguage = '',
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

  const setLanguage = async (pathname: string) => {
    const { lang, path } = splitLanguage(trimTrailingSlash(pathname), languages, defaultLanguage);
    history.basePath = getBasePath(lang, defaultLanguage);
    await i18n?.setLanguage(lang);
    return { lang, path };
  };

  /**
   * 处理客户端导航时的数据请求，URL 是页面路径加上 `/__data.json`，预渲染时 `input` 是路径
   *
   * 返回路径匹配的 layout 和页面的服务端数据，key 是标签名，跳转时数据为 `null`，响应头中有跳转的地址，
   * 客户端只在有服务端模块时请求，没有 `load`（例如只有 `actions`）时数据为空对象
   */
  const loadData = (input: Request | string) =>
    runInRequest(async () => {
      const { url, setCookies } = setRequest(input);
      const pagePathname = url.pathname.slice(0, -DATA_FILE.length - 1) || '/';
      const { path } = await setLanguage(pagePathname);
      const pageUrl = new URL(`${url.origin}${pagePathname}${url.search}`);
      const routes = findServerRoutes(path);
      if (!routes.length) return { status: 404, headers: toHeaders(setCookies), data: null };
      const data: RouteData = {};
      // 调用了 `notFound()` 的路由，其他路由的数据仍然可以使用，例如 layout 的数据
      let notFoundTag: string | undefined;
      try {
        await Promise.all(
          routes.map(async ({ tag, params }) => {
            if (!(await getServerModule(tag))?.load) return;
            try {
              data[tag] = await runServerLoad(tag, params, pageUrl);
            } catch (err) {
              if (!(err instanceof NotFound)) throw err;
              notFoundTag = tag;
            }
          }),
        );
      } catch (err) {
        if (!(err instanceof Redirect)) throw err;
        return { status: 200, headers: toHeaders(setCookies, { [REDIRECT_HEADER]: err.location }), data: null };
      }
      if (notFoundTag)
        return { status: 200, headers: toHeaders(setCookies, { [NOT_FOUND_HEADER]: notFoundTag }), data };
      return { status: 200, headers: toHeaders(setCookies), data };
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
        const data = await actions[name](createServerContext(matched.info.tag, matched.params, url));
        result = { type: 'success', data: toJSONValue(data) };
      } catch (err) {
        if (!(err instanceof Redirect)) throw err;
        result = { type: 'redirect', location: err.location };
      }
      return { headers: toHeaders(setCookies), result };
    });

  /** 渲染页面 `url` 中的纯服务端元素，返回元素的 HTML，顺序和 `elements` 一致 */
  const renderElements = (url: string, elements: ServerElementParams[]) =>
    runInRequest(async () => {
      const { origin, pathname, search } = new URL(url, 'http://localhost');
      const { path } = await setLanguage(pathname);
      // 元素在页面和 layout 的模块中定义
      await Promise.all(matchRoutes(path).map(({ info }) => info.load()));
      const options = { url: `${origin}${path}${search}` };
      return Promise.all(elements.map(({ tag, attrs, props }) => renderServerElement(tag, attrs, props, options)));
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
        const headers = toHeaders(setCookies, { location: redirect.location });
        return { status: redirect.status, headers, html: (async function* () {})() };
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

  /** 路径匹配的 layout 和页面的服务端模块都没有设置 `prerender = false` */
  const canPrerender = async (path: string) => {
    const routes = findServerRoutes(splitLanguage(path, languages, defaultLanguage).path);
    const modules = await Promise.all(routes.map(({ tag }) => getServerModule(tag)));
    return modules.every((mod) => mod?.prerender !== false);
  };

  /** 需要预渲染的路径，动态路由使用 `*.server.ts` 或者页面的 `paths` 选项 */
  const getPaths = async () => {
    const paths: string[] = [];
    for (const { pattern, info } of getPageRoutes()) {
      if (!/[:*]/.test(pattern)) {
        paths.push(pattern);
        continue;
      }
      const getParams = (await getServerModule(info.tag))?.paths || getPageOptions((await info.load()).default).paths;
      for (const params of (await getParams?.()) || []) paths.push(fillPattern(pattern, params));
    }
    const allowed = await Promise.all(paths.map(canPrerender));
    const result = paths.filter((_, index) => allowed[index]);
    if (!languages.length) return result;
    return languages.flatMap((lang) => result.map((path) => localizePath(lang, path, defaultLanguage)));
  };

  /** 页面或 layout 是否有服务端数据，预渲染时需要输出数据文件 */
  const hasServerData = (path: string) =>
    findServerRoutes(splitLanguage(path, languages, defaultLanguage).path).length > 0;

  return { renderDocument, loadData, runAction, renderElements, getPaths, canPrerender, hasServerData };
}

export type Renderer = ReturnType<typeof createRenderer>;
