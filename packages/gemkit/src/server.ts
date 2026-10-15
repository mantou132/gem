// 必须在 Gem 之前执行，用来模拟 DOM 环境
import '@mantou/gem-ssr';

import { history, type TemplateResult, titleStore } from '@mantou/gem';
import { matchPath } from '@mantou/gem/elements/route';
import type { I18n } from '@mantou/gem/helper/i18n';
import { type RenderOptions, render, renderServerElement, runInRequest } from '@mantou/gem-ssr';

import { DATA_FILE, DATA_SCRIPT_ID, REDIRECT_HEADER, trimTrailingSlash } from './constants';
import { createCookies } from './cookies';
import {
  type ActionResult,
  createServerContext,
  getServerModule,
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
import { getLayoutParams } from './outlet';
import { getPageOptions, type Params } from './page';
import { formatTitle, type TitleOptions } from './title';

export interface PageEntry {
  pattern: string;
  tag: string;
  load: () => Promise<{ default: CustomElementConstructor }>;
}

export interface LayoutEntry {
  pattern: string;
  tag: string;
  load: () => Promise<unknown>;
}

export interface RendererOptions extends TitleOptions {
  app: TemplateResult;
  /** 按匹配优先级排序 */
  pages: PageEntry[];
  layouts?: LayoutEntry[];
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
  pages,
  layouts = [],
  serverModules = {},
  i18n,
  languages = [],
  defaultLanguage = '',
  ...titleOptions
}: RendererOptions) {
  setServerModules(serverModules);

  const findPage = (path: string) => {
    for (const page of pages) {
      const params = matchPath(page.pattern, path);
      if (params) return { page, params };
    }
  };

  /** 路径匹配的 layout 和页面中有服务端模块的，以及它们的参数 */
  const findServerRoutes = (path: string) => {
    const routes = layouts.flatMap(({ pattern, tag }) => {
      const params = tag in serverModules && matchPath(pattern, path);
      return params ? [{ tag, params: getLayoutParams(params) }] : [];
    });
    const result = findPage(path);
    if (result && result.page.tag in serverModules) routes.push({ tag: result.page.tag, params: result.params });
    return routes;
  };

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
   * 返回路径匹配的 layout 和页面的服务端数据，key 是标签名，跳转时数据为 `null`，响应头中有跳转的地址
   */
  const loadData = (input: Request | string) =>
    runInRequest(async () => {
      const { url, setCookies } = setRequest(input);
      const pagePathname = url.pathname.slice(0, -DATA_FILE.length - 1) || '/';
      const { path } = await setLanguage(pagePathname);
      const pageUrl = new URL(`${url.origin}${pagePathname}${url.search}`);
      const data: RouteData = {};
      try {
        await Promise.all(
          findServerRoutes(path).map(async ({ tag, params }) => {
            if ((await getServerModule(tag))?.load) data[tag] = await runServerLoad(tag, params, pageUrl);
          }),
        );
      } catch (err) {
        if (!(err instanceof Redirect)) throw err;
        return { status: 200, headers: toHeaders(setCookies, { [REDIRECT_HEADER]: err.location }), data: null };
      }
      const status = Object.keys(data).length ? 200 : 404;
      return { status, headers: toHeaders(setCookies), data: status === 200 ? data : null };
    });

  /** 处理页面的表单提交 `POST <page path>?/<name>`，没有对应的 action 时结果为 `null` */
  const runAction = (request: Request) =>
    runInRequest(async () => {
      const { url, setCookies } = setRequest(request);
      const name = [...url.searchParams.keys()].find((key) => key.startsWith('/'))?.slice(1);
      const { path } = await setLanguage(url.pathname);
      const matched = findPage(path);
      const actions = matched && (await getServerModule(matched.page.tag))?.actions;
      if (name === undefined || !actions || !Object.hasOwn(actions, name)) {
        return { headers: toHeaders(setCookies), result: null };
      }
      let result: ActionResult;
      try {
        const data = await actions[name](createServerContext(matched.page.tag, matched.params, url));
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
      await Promise.all([
        findPage(path)?.page.load(),
        ...layouts.filter(({ pattern }) => matchPath(pattern, path)).map(({ load }) => load()),
      ]);
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
      const chunks = render(app, { url: `${url.origin}${path}${url.search}`, serverElements });
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
      // 不再读取剩余的内容
      const { redirect } = requestState;
      if (redirect) {
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
        status: findPage(path) ? 200 : 404,
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
    for (const { pattern, tag, load } of pages) {
      if (!/[:*]/.test(pattern)) {
        paths.push(pattern);
        continue;
      }
      const getParams = (await getServerModule(tag))?.paths || getPageOptions((await load()).default).paths;
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
