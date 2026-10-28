// 必须在 Gem 之前执行，用来模拟 DOM 环境
import '@mantou/gem-ssr';

import { history, type TemplateResult, titleStore } from '@mantou/gem';
import { matchPath } from '@mantou/gem/elements/route';
import type { I18n } from '@mantou/gem/helper/i18n';
import { type RenderOptions, render, renderServerElement, runInRequest } from '@mantou/gem-ssr';

import { CLIENT_HEADER, DATA_FILE, DATA_SCRIPT_ID, escapeHtml, REDIRECT_HEADER, trimTrailingSlash } from './constants';
import { createCookies } from './cookies';
import {
  type ActionResult,
  type AppServerModule,
  createServerContext,
  type DataFile,
  type EndpointModule,
  type Endpoints,
  getRequestEvent,
  getServerModule,
  HttpError,
  type Platform,
  Redirect,
  type RequestMethod,
  type RouteData,
  type RouteError,
  requestState,
  runServerLoad,
  type ServerElementParams,
  type ServerModules,
  setErrorHandler,
  setRevalidateHandler,
  setServerModules,
  ssrData,
  toErrorData,
  toJSONValue,
  toRouteError,
} from './data';
import { getBasePath, LANGUAGE_COOKIE, localizePath, matchLanguage, parseAcceptLanguage, splitLanguage } from './i18n';
import { formatMeta } from './meta';
import { getLayoutParams, getPageRoutes, getRouteMeta, hasServerLoad, matchPage, matchRoutes } from './outlet';
import { getPageOptions, type Params } from './page';
import { formatTitle, type TitleOptions } from './title';

export interface RendererOptions extends TitleOptions {
  /** 路由使用 `setOutlets` 设置的路由，和客户端一样匹配 */
  app: TemplateResult;
  /** 页面和 layout 标签名对应的 `*.server.ts` */
  serverModules?: ServerModules;
  /** API 路由，按匹配优先级排序 */
  endpoints?: Endpoints;
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
  endpoints = [],
  appServerModule = {},
  i18n,
  languages = [],
  defaultLanguage = '',
  prefixDefaultLanguage = false,
  ...titleOptions
}: RendererOptions) {
  setServerModules(serverModules);
  setErrorHandler(appServerModule.handleError);

  /** 路径匹配的 layout 和页面（包括 404 页面）中有服务端模块的，以及它们的参数 */
  const findServerRoutes = (path: string) =>
    matchRoutes(path).flatMap(({ info, params }) =>
      info.server ? [{ tag: info.tag, params: info.layout ? getLayoutParams(params) : params }] : [],
    );

  /**
   * 设置当前请求和平台上下文，返回请求的 URL 和请求中设置的 cookie，预渲染时 `input` 是路径，没有请求，
   * ISR 在后台预渲染时也有平台上下文
   */
  const setRequest = (input: Request | string, platform?: Platform) => {
    requestState.platform = platform;
    if (typeof input === 'string') return { url: new URL(input, 'http://localhost'), setCookies: [] };
    const { cookies, setCookies } = createCookies(input);
    requestState.request = input;
    requestState.cookies = cookies;
    return { url: new URL(input.url), setCookies };
  };

  const split = (pathname: string) => splitLanguage(pathname, languages, defaultLanguage, prefixDefaultLanguage);
  const localize = (lang: string, path: string) => localizePath(lang, path, defaultLanguage, prefixDefaultLanguage);

  /** 预渲染的路径（不包含语言前缀）存在的语言，没有前缀的路径的跳转页面只跳转到这些语言 */
  const pathLanguages = new Map<string, string[]>();

  /**
   * 所有语言都有前缀时，没有前缀的路径跳转到用户上次使用的语言或者浏览器的语言，都不匹配时跳转到默认语言；
   * 预渲染时没有请求，由跳转页面中的脚本在浏览器中选择，规则和 `matchLanguage` 相同
   */
  const redirectToLanguage = (path: string, search: string): RenderResult => {
    const { request, cookies } = requestState;
    if (request) {
      const accept = parseAcceptLanguage(request.headers.get('accept-language') || '');
      const lang = matchLanguage([cookies?.get(LANGUAGE_COOKIE), ...accept], languages) || defaultLanguage;
      // 因人而异，不能被共享缓存
      const headers = new Headers({
        location: localize(lang, path) + search,
        'cache-control': 'private, no-store',
        vary: 'Accept-Language, Cookie',
      });
      return { status: 302, headers, html: (async function* () {})() };
    }
    const targets = Object.fromEntries((pathLanguages.get(path) || languages).map((e) => [e, localize(e, path)]));
    const script =
      `<script>{const p=${JSON.stringify(targets).replaceAll('<', '\\u003c')};` +
      `const c=document.cookie.match(/(?:^|; )${LANGUAGE_COOKIE}=([^;]*)/)?.[1];` +
      `const l=[c,...navigator.languages].flatMap((e)=>e?[e,e.split('-')[0]]:[]).find((e)=>p[e])||${JSON.stringify(defaultLanguage)};` +
      `location.replace(p[l]+location.search+location.hash)}</script>`;
    const headers = new Headers({ location: localize(defaultLanguage, path) });
    return {
      status: 302,
      headers,
      html: (async function* () {
        yield script;
      })(),
    };
  };

  const setLanguage = async (pathname: string) => {
    const { lang, path } = split(trimTrailingSlash(pathname));
    history.basePath = getBasePath(lang, defaultLanguage, prefixDefaultLanguage);
    await i18n?.setLanguage(lang);
    return { lang, path };
  };

  /**
   * `handle` 出错时错误页面渲染的位置：第一个有服务端 `load` 的路由，和客户端导航时请求数据的路由一致，
   * 都没有时为页面
   */
  const getErrorTarget = (path: string) => {
    const routes = matchRoutes(path);
    return (routes.find(({ info }) => hasServerLoad(info)) || routes.at(-1))?.info.tag ?? '';
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
   * 客户端只在有服务端模块时请求，没有 `load`（例如只有 `actions`）时数据为空对象，
   * 出错时其他路由的数据仍然可以使用，例如 layout 的数据
   */
  const loadData = (input: Request | string, platform?: Platform) =>
    runInRequest(async (): Promise<{ status: number; headers: Headers; body: DataFile | null }> => {
      const { url, setCookies } = setRequest(input, platform);
      const pagePathname = url.pathname.slice(0, -DATA_FILE.length - 1) || '/';
      const { path } = await setLanguage(pagePathname);
      const pageUrl = new URL(`${url.origin}${pagePathname}${url.search}`);
      const routes = findServerRoutes(path);
      const data: RouteData = {};
      // 多个路由出错时使用外层的，和渲染时一致
      const errors: RouteError[] = [];
      try {
        try {
          await handleRequest(pageUrl, path);
        } catch (err) {
          // 和渲染时一致，在第一个请求数据的路由的位置渲染错误页面
          if (!routes.length) throw err;
          errors[0] = toRouteError(getErrorTarget(path), err);
        }
        if (!routes.length) return { status: 404, headers: toHeaders(setCookies), body: null };
        if (!errors.length) {
          await Promise.all(
            routes.map(async ({ tag, params }, index) => {
              if (!(await getServerModule(tag))?.load) return;
              try {
                data[tag] = await runServerLoad(tag, params);
              } catch (err) {
                errors[index] = toRouteError(tag, err);
              }
            }),
          );
        }
      } catch (err) {
        if (!(err instanceof Redirect)) throw err;
        return { status: 200, headers: toHeaders(setCookies), body: { redirect: err.location } };
      }
      return { status: 200, headers: toHeaders(setCookies), body: { data, error: errors.find(Boolean) } };
    });

  /** 页面和 layout 中名称为 `name` 的 action，从页面开始逐层向外查找，内层的覆盖外层的同名 action */
  const findAction = async (path: string, name: string) => {
    if (!matchPage(path)) return;
    for (const { tag, params } of findServerRoutes(path).reverse()) {
      const actions = (await getServerModule(tag))?.actions;
      if (actions && Object.hasOwn(actions, name)) return { tag, params, action: actions[name] };
    }
  };

  /**
   * 处理页面的表单提交 `POST <page path>?/<name>`，action 可以在页面或者 layout 中，参数和 `load` 的一样，
   * 没有对应的 action 时结果为 `null`，出错时错误页面渲染在 action 所在的页面或 layout 的位置
   */
  const runAction = (request: Request, platform?: Platform) =>
    runInRequest(async () => {
      const { url, setCookies } = setRequest(request, platform);
      const name = [...url.searchParams.keys()].find((key) => key.startsWith('/'))?.slice(1);
      const { path } = await setLanguage(url.pathname);
      const found = name === undefined ? undefined : await findAction(path, name);
      if (!found) return { headers: toHeaders(setCookies), result: null };
      let result: ActionResult;
      try {
        await handleRequest(url, path);
        const data = await found.action(createServerContext(found.tag, found.params));
        result = { type: 'success', data: toJSONValue(data) };
      } catch (err) {
        result =
          err instanceof Redirect
            ? { type: 'redirect', location: err.location }
            : { type: 'error', error: toRouteError(found.tag, err) };
      }
      return { headers: toHeaders(setCookies), result };
    });

  /**
   * 渲染页面中的纯服务端元素，请求体是 `{ url, elements }`，`url` 是页面的路径，
   * 返回元素的 HTML，顺序和 `elements` 一致，跳转时为 `null`，响应头中有跳转的地址，`handle` 出错时为 `null`
   */
  const renderElements = (request: Request, platform?: Platform) =>
    runInRequest(async (): Promise<{ status: number; headers: Headers; html: string[] | null }> => {
      const { url, setCookies } = setRequest(request, platform);
      const body: { url: string; elements: ServerElementParams[] } = await request.json();
      const { pathname, search } = new URL(body.url, url);
      const { path } = await setLanguage(pathname);
      try {
        await handleRequest(new URL(`${url.origin}${pathname}${search}`), path);
      } catch (err) {
        if (err instanceof Redirect) {
          return { status: 200, headers: toHeaders(setCookies, { [REDIRECT_HEADER]: err.location }), html: null };
        }
        return { status: toErrorData(err).status, headers: toHeaders(setCookies), html: null };
      }
      // 元素在页面和 layout 的模块中定义
      await Promise.all(matchRoutes(path).map(({ info }) => info.load()));
      const options = { url: `${url.origin}${path}${search}` };
      const html = await Promise.all(
        body.elements.map(({ tag, attrs, props }) => renderServerElement(tag, attrs, props, options)),
      );
      return { status: 200, headers: toHeaders(setCookies), html };
    });

  /** API 路由的输入：`GET` `DELETE` 是查询参数，其他方法是 JSON 请求体，处理函数还可以自己读取 `request` */
  const getInput = async (request: Request, url: URL) => {
    if (request.method === 'GET' || request.method === 'HEAD' || request.method === 'DELETE') {
      return Object.fromEntries(url.searchParams);
    }
    if (!request.headers.get('content-type')?.includes('application/json')) return;
    try {
      return await request.clone().json();
    } catch {
      throw new HttpError(400, 'Invalid JSON');
    }
  };

  /** 路径匹配的 API 路由和参数，路径不包含语言前缀 */
  const matchEndpoint = (pathname: string) => {
    const path = trimTrailingSlash(pathname);
    for (const endpoint of endpoints) {
      const params = matchPath(endpoint.pattern, path);
      if (params) return { endpoint, params, path };
    }
  };

  /**
   * 处理 API 路由的请求，先执行 `handle`，处理函数返回 `Response`，其他值作为 JSON 响应，
   * `redirect` 响应跳转（`$gemkit/api` 的请求响应 `REDIRECT_HEADER`），`error` 响应 JSON 格式的错误，
   * 没有对应的请求方法时为 405
   */
  const runEndpoint = (request: Request, platform?: Platform) =>
    runInRequest(async (): Promise<Response> => {
      const { url, setCookies } = setRequest(request, platform);
      const matched = matchEndpoint(url.pathname);
      if (!matched) return new Response(null, { status: 404 });
      const { endpoint, params, path } = matched;
      let response: Response;
      try {
        await handleRequest(url, path);
        const mod: EndpointModule = await endpoint.load();
        const method = (request.method === 'HEAD' ? 'GET' : request.method) as RequestMethod;
        const fn = Object.hasOwn(mod, method) ? mod[method] : undefined;
        if (!fn) {
          const allow = Object.keys(mod).filter((key) => /^[A-Z]+$/.test(key));
          return new Response(null, { status: 405, headers: toHeaders(setCookies, { allow: allow.join(', ') }) });
        }
        const result = await fn(createServerContext(endpoint.pattern, params), await getInput(request, url));
        response = result instanceof Response ? result : Response.json(toJSONValue(result));
      } catch (err) {
        if (err instanceof Redirect) {
          // `fetch` 会自动跟随跳转，客户端拿不到跳转的地址
          if (request.headers.has(CLIENT_HEADER)) {
            return new Response(null, { headers: toHeaders(setCookies, { [REDIRECT_HEADER]: err.location }) });
          }
          return new Response(null, { status: err.status, headers: toHeaders(setCookies, { location: err.location }) });
        }
        const data = toErrorData(err);
        return Response.json(data, { status: data.status, headers: toHeaders(setCookies) });
      }
      // 返回的响应头可能不可修改，例如 `Response.redirect`
      const headers = toHeaders(setCookies, response.headers);
      return new Response(request.method === 'HEAD' ? null : response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    });

  /**
   * 将渲染结果插入 HTML 模版，模版中使用 `<!--gemkit-body-->` 标记内容位置
   *
   * 预渲染时 `input` 是路径，使用 `serverElements` 收集纯服务端元素的 HTML，
   * `error` 是没有 JS 时提交表单的 action 的错误，渲染错误页面
   */
  const renderDocument = (
    template: string,
    input: Request | string,
    {
      serverElements,
      error,
      platform,
    }: Pick<RenderOptions, 'serverElements'> & { error?: RouteError; platform?: Platform } = {},
  ) =>
    // 每个请求有独立的 history、i18n、store 和 `requestState`
    runInRequest(async (): Promise<RenderResult> => {
      const { url, setCookies } = setRequest(input, platform);
      const { lang, path } = await setLanguage(url.pathname);
      const redirectTo = ({ status, location }: Redirect) => ({
        status,
        headers: toHeaders(setCookies, { location }),
        html: (async function* () {})(),
      });
      // 所有语言都有前缀时，没有前缀的路径跳转到用户的语言
      if (localize(lang, path) !== trimTrailingSlash(url.pathname)) return redirectToLanguage(path, url.search);
      // 调用 `render` 时立即开始渲染，需要先执行
      try {
        await handleRequest(url, path);
        requestState.error = error;
      } catch (err) {
        if (err instanceof Redirect) return redirectTo(err);
        // 渲染时在对应路由的位置渲染错误页面
        requestState.error = toRouteError(getErrorTarget(path), err);
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
      let html = template
        .replace(
          /<title>[\s\S]*?<\/title>/,
          () => `<title>${escapeHtml(formatTitle(titleStore.title, titleOptions))}</title>`,
        )
        .replace('</head>', () => `${formatMeta(getRouteMeta(path))}</head>`);
      if (lang) {
        html = html.replace(
          /<html([^>]*)>/,
          (_, attrs: string) => `<html${attrs.replace(/\s+lang="[^"]*"/, '')} lang="${lang}">`,
        );
      }
      const [start, end] = html.split('<!--gemkit-body-->');
      return {
        status: requestState.error?.status ?? (matchPage(path) ? 200 : 404),
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
   * 并且 `handle` 没有读取 `request`、`cookies`，也没有跳转或者出错，例如需要登录的页面
   */
  const canPrerender = (pathname: string, platform?: Platform) =>
    runInRequest(async () => {
      requestState.platform = platform;
      const { path } = split(pathname);
      const modules = await Promise.all(findServerRoutes(path).map(({ tag }) => getServerModule(tag)));
      if (modules.some((mod) => mod?.prerender === false)) return false;
      try {
        await handleRequest(new URL(pathname, 'http://localhost'), path);
      } catch (err) {
        // 预渲染时读取 `cookies` 会报错
        if (!(err instanceof Redirect || err instanceof HttpError) && !requestState.personal) throw err;
        return false;
      }
      return !requestState.personal;
    });

  /** 页面和 layout 的服务端模块中最小的 `revalidate`，都没有设置时页面不使用 ISR */
  const getRevalidate = async (pathname: string) => {
    const { path } = split(pathname);
    const modules = await Promise.all(findServerRoutes(path).map(({ tag }) => getServerModule(tag)));
    const values = modules.flatMap((mod) => (mod?.revalidate === undefined ? [] : [mod.revalidate]));
    return values.length ? Math.min(...values) : undefined;
  };

  /** 需要预渲染的路径，动态路由使用 `*.server.ts` 或者页面的 `paths` 选项 */
  const getPaths = async () => {
    const localized: string[] = [];
    pathLanguages.clear();
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
      for (const path of paths) pathLanguages.set(path, [...(pathLanguages.get(path) || []), lang]);
      // `handle` 读取的 `url` 包含语言前缀，每个语言的路径分别判断
      localized.push(...(languages.length ? paths.map((path) => localize(lang, path)) : paths));
      // 没有前缀的路径输出跳转页面，静态托管时也能跳转到默认语言
      if (prefixDefaultLanguage && lang === defaultLanguage) localized.push(...paths);
    }
    const allowed = await Promise.all(localized.map((path) => canPrerender(path)));
    return localized.filter((_, index) => allowed[index]);
  };

  /** 页面或 layout 是否有服务端数据，预渲染时需要输出数据文件 */
  const hasServerData = (path: string) => findServerRoutes(split(path).path).length > 0;

  /** 预渲染 404 页面时使用的路径，使用默认语言 */
  const notFoundPath = localize(defaultLanguage, '/__gemkit_404__');

  return {
    renderDocument,
    loadData,
    runAction,
    renderElements,
    matchEndpoint,
    runEndpoint,
    getPaths,
    canPrerender,
    getRevalidate,
    setRevalidateHandler,
    hasServerData,
    notFoundPath,
  };
}

export type Renderer = ReturnType<typeof createRenderer>;
