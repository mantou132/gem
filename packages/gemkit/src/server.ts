// 必须在 Gem 之前执行，用来模拟 DOM 环境
import '@mantou/gem-ssr';

import { history, type TemplateResult, titleStore } from '@mantou/gem';
import { matchPath } from '@mantou/gem/elements/route';
import type { I18n } from '@mantou/gem/helper/i18n';
import { type RenderOptions, render, renderServerElement, runInRequest } from '@mantou/gem-ssr';

import {
  CLIENT_HEADER,
  DATA_FILE,
  DATA_SCRIPT_ID,
  escapeHtml,
  HTML_TYPE,
  REDIRECT_HEADER,
  trimTrailingSlash,
} from './constants';
import { createCookies } from './cookies';
import {
  type ActionResult,
  type AppServerModule,
  createServerContext,
  type DataFile,
  type ElementsResult,
  type EndpointModule,
  type Endpoints,
  getRequestEvent,
  getServerModule,
  type Handle,
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
import {
  getLayoutParams,
  getPageRoutes,
  getRouteMeta,
  getSSRRoutes,
  hasServerLoad,
  matchPage,
  matchRoutes,
} from './outlet';
import { getPageOptions, type Params } from './page';
import { formatTitle, type TitleOptions } from './title';

export type RouteChunks = Record<string, string[]>;

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
  /** 客户端构建中 layout 和页面的标签名对应的 chunk 文件，渲染页面时预加载 */
  routeChunks?: RouteChunks;
  /**
   * 客户端构建的 hash，数据文件和服务端元素的响应中包含它，
   * 重新部署后客户端发现和自己的版本不同时重新加载页面，开发时没有
   */
  version?: string;
}

/**
 * 预渲染（`input` 是路径）时页面不能预渲染：页面或 layout 设置了 `prerender = false`，
 * 或者 `handle` 读取了 `request`、`cookies`，或者在 `resolve()` 之前跳转、出错，由服务端在请求时渲染
 *
 * 只在服务端产物中使用，构建插件是另一个 bundle，不能用 `instanceof` 判断
 */
class NotPrerenderable {}

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
 * 响应头，在请求作用域中调用：因人而异的响应不能被 CDN 等共享缓存，`setHeaders` 和 `init` 可以覆盖，
 * 最后添加设置的 cookie
 */
function toHeaders(init?: HeadersInit) {
  const { personal, setCookies = [], headers: custom } = requestState;
  const headers = new Headers();
  if (personal || setCookies.length) headers.set('cache-control', 'private, no-store');
  for (const source of [custom, new Headers(init)]) {
    source?.forEach((value, name) => {
      if (name === 'set-cookie') headers.append(name, value);
      else headers.set(name, value);
    });
  }
  for (const cookie of setCookies) headers.append('set-cookie', cookie);
  return headers;
}

/** 预加载客户端水合时需要加载的 layout 和页面的 chunk，和入口脚本并行请求 */
function formatPreload(routeChunks: RouteChunks) {
  const files = new Set(getSSRRoutes().flatMap((tag) => routeChunks[tag] || []));
  let result = '';
  for (const file of files) {
    result += `<link rel="preload" as="${file.endsWith('.css') ? 'style' : 'script'}" href="${escapeHtml(file)}">`;
  }
  return result;
}

function fillPattern(pattern: string, params: Params) {
  return pattern
    .replace(/:([^/]+)/g, (_, name) => encodeURIComponent(params[name]))
    .replace('*', () => params['*'] ?? params[0] ?? '');
}

const redirectResponse = ({ status, location }: Redirect) =>
  new Response(null, { status, headers: toHeaders({ location }) });

const resolveHandle: Handle = (_, resolve) => resolve();

export function createRenderer({
  app,
  serverModules = {},
  endpoints = [],
  appServerModule = {},
  i18n,
  languages = [],
  defaultLanguage = '',
  prefixDefaultLanguage = false,
  routeChunks = {},
  version,
  ...titleOptions
}: RendererOptions) {
  setServerModules(serverModules);
  setErrorHandler(appServerModule.handleError);
  const handle = appServerModule.handle || resolveHandle;

  /** 路径匹配的 layout 和页面（包括 404 页面）中有服务端模块的，以及它们的参数 */
  const findServerRoutes = (path: string) =>
    matchRoutes(path).flatMap(({ info, params }) =>
      info.server ? [{ tag: info.tag, params: info.layout ? getLayoutParams(params) : params }] : [],
    );

  /**
   * 设置当前请求和平台上下文，返回请求的 URL，预渲染时 `input` 是路径，没有请求，
   * ISR 在后台预渲染时也有平台上下文
   */
  const setRequest = (input: Request | string, platform?: Platform) => {
    requestState.platform = platform;
    requestState.headers = new Headers();
    if (typeof input === 'string') return new URL(input, 'http://localhost');
    const { cookies, setCookies } = createCookies(input);
    requestState.request = input;
    requestState.cookies = cookies;
    requestState.setCookies = setCookies;
    return new URL(input.url);
  };

  const split = (pathname: string) => splitLanguage(pathname, languages, defaultLanguage, prefixDefaultLanguage);
  const localize = (lang: string, path: string) => localizePath(lang, path, defaultLanguage, prefixDefaultLanguage);

  /** 预渲染的路径（不包含语言前缀）存在的语言，没有前缀的路径的跳转页面只跳转到这些语言 */
  const pathLanguages = new Map<string, string[]>();

  /**
   * 所有语言都有前缀时，没有前缀的路径跳转到用户上次使用的语言或者浏览器的语言，都不匹配时跳转到默认语言；
   * 预渲染时没有请求，由跳转页面中的脚本在浏览器中选择，规则和 `matchLanguage` 相同
   */
  const redirectToLanguage = (path: string, search: string) => {
    const { request, cookies } = requestState;
    if (request) {
      const accept = parseAcceptLanguage(request.headers.get('accept-language') || '');
      const lang = matchLanguage([cookies?.get(LANGUAGE_COOKIE), ...accept], languages) || defaultLanguage;
      // 因人而异，不能被共享缓存
      const headers = toHeaders({
        location: localize(lang, path) + search,
        'cache-control': 'private, no-store',
        vary: 'Accept-Language, Cookie',
      });
      return new Response(null, { status: 302, headers });
    }
    const targets = Object.fromEntries((pathLanguages.get(path) || languages).map((e) => [e, localize(e, path)]));
    const script =
      `<script>{const p=${JSON.stringify(targets).replaceAll('<', '\\u003c')};` +
      `const c=document.cookie.match(/(?:^|; )${LANGUAGE_COOKIE}=([^;]*)/)?.[1];` +
      `const l=[c,...navigator.languages].flatMap((e)=>e?[e,e.split('-')[0]]:[]).find((e)=>p[e])||${JSON.stringify(defaultLanguage)};` +
      `location.replace(p[l]+location.search+location.hash)}</script>`;
    return new Response(script, { status: 302, headers: toHeaders({ location: localize(defaultLanguage, path) }) });
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

  /**
   * 执行 `src/app.server.ts` 的 `handle`，`url` 是页面的 URL，`path` 不包含语言前缀；
   * `resolve()` 使用 `render()` 生成响应，`handle` 在 `resolve()` 之前抛出时使用 `render(err)`，
   * 由请求的类型决定这个错误的响应，例如渲染错误页面、响应跳转
   */
  const runHandle = async (url: URL, path: string, render: (err?: unknown) => Promise<Response>) => {
    requestState.url = url;
    requestState.path = path;
    requestState.locals = {};
    const prerendering = !requestState.request;
    let resolved: Promise<Response> | undefined;
    // 渲染中的错误不是 `handle` 的，例如预渲染时 `load` 读取 cookie，直接抛出
    let renderFailed = false;
    const resolve = () =>
      (resolved ||= render().catch((err) => {
        renderFailed = true;
        throw err;
      }));
    let response: Response;
    try {
      response = await handle(getRequestEvent(), resolve);
    } catch (err) {
      if (renderFailed) throw err;
      // 预渲染时读取 `request`、`cookies` 会报错
      const handled = !resolved && (err instanceof Redirect || err instanceof HttpError);
      if (prerendering && (requestState.personal || handled)) throw new NotPrerenderable();
      if (resolved) throw err;
      return render(err);
    }
    if (prerendering && requestState.personal) throw new NotPrerenderable();
    // 不使用 `instanceof`，`@hono/node-server` 会替换全局的 `Response`
    if (!response) throw new Error('gemkit: `handle` must return a `Response`, e.g. `resolve()`');
    return response;
  };

  /** 路径匹配的 layout 和页面的服务端模块都没有设置 `prerender = false` */
  const isPrerenderable = async (path: string) => {
    const modules = await Promise.all(findServerRoutes(path).map(({ tag }) => getServerModule(tag)));
    return modules.every((mod) => mod?.prerender !== false);
  };

  /**
   * 渲染页面，将渲染结果插入 HTML 模版，模版中使用 `<!--gemkit-body-->` 标记内容位置，
   * 页面的数据和标题确定后才开始输出，之后的异步内容（例如 `@server`）流式输出；
   * `error` 是需要渲染错误页面的路由，预渲染时使用 `serverElements` 收集纯服务端元素的 HTML
   */
  const renderPage = async (
    template: string,
    url: URL,
    lang: string,
    path: string,
    error?: RouteError,
    serverElements?: RenderOptions['serverElements'],
  ) => {
    requestState.error = error;
    // 调用 `render` 时立即开始渲染，客户端断开时中止渲染，预渲染时没有请求
    const chunks = render(app, {
      url: `${url.origin}${path}${url.search}`,
      serverElements,
      signal: requestState.request?.signal,
    });
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
      return redirectResponse(redirect);
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
      .replace('</head>', () => `${formatMeta(getRouteMeta(path))}${formatPreload(routeChunks)}</head>`);
    if (lang) {
      html = html.replace(
        /<html([^>]*)>/,
        (_, attrs: string) => `<html${attrs.replace(/\s+lang="[^"]*"/, '')} lang="${lang}">`,
      );
    }
    const [start, end] = html.split('<!--gemkit-body-->');
    const stream = toStream(
      (async function* () {
        yield start + body;
        yield* chunks;
        yield dataScript + end;
      })(),
    );
    return new Response(stream, {
      status: requestState.error?.status ?? (matchPage(path) ? 200 : 404),
      headers: toHeaders({ 'content-type': HTML_TYPE }),
    });
  };

  /**
   * 渲染页面，预渲染时 `input` 是路径，使用 `serverElements` 收集纯服务端元素的 HTML，
   * 不能预渲染时抛出 `NotPrerenderable`
   */
  const renderDocument = (
    template: string,
    input: Request | string,
    { serverElements, platform }: Pick<RenderOptions, 'serverElements'> & { platform?: Platform } = {},
  ) =>
    // 每个请求有独立的 history、i18n、store 和 `requestState`
    runInRequest(async () => {
      const url = setRequest(input, platform);
      const { lang, path } = await setLanguage(url.pathname);
      if (typeof input === 'string' && !(await isPrerenderable(path))) throw new NotPrerenderable();
      return runHandle(url, path, async (err) => {
        // 所有语言都有前缀时，没有前缀的路径跳转到用户的语言
        if (localize(lang, path) !== trimTrailingSlash(url.pathname)) return redirectToLanguage(path, url.search);
        if (err instanceof Redirect) return redirectResponse(err);
        // 在对应路由的位置渲染错误页面
        const error = err === undefined ? undefined : toRouteError(getErrorTarget(path), err);
        return renderPage(template, url, lang, path, error, serverElements);
      });
    });

  /**
   * 处理客户端导航时的数据请求，URL 是页面路径加上 `/__data.json`，预渲染时 `input` 是路径
   *
   * 响应数据文件，其中有路径匹配的 layout 和页面的服务端数据，key 是标签名，
   * 客户端只在有服务端模块时请求，没有 `load`（例如只有 `actions`）时数据为空对象，
   * 出错时其他路由的数据仍然可以使用，例如 layout 的数据
   */
  const loadData = (input: Request | string, platform?: Platform) =>
    runInRequest(async () => {
      const url = setRequest(input, platform);
      const pagePathname = url.pathname.slice(0, -DATA_FILE.length - 1) || '/';
      const { path } = await setLanguage(pagePathname);
      const pageUrl = new URL(`${url.origin}${pagePathname}${url.search}`);
      const routes = findServerRoutes(path);
      const json = (body: DataFile | null, status = 200) => Response.json(body, { status, headers: toHeaders() });
      return runHandle(pageUrl, path, async (err) => {
        if (err instanceof Redirect) return json({ redirect: err.location, version });
        if (!routes.length) return json(null, 404);
        const data: RouteData = {};
        // 多个路由出错时使用外层的，和渲染时一致
        const errors: RouteError[] = [];
        try {
          if (err !== undefined) {
            // 和渲染时一致，在第一个请求数据的路由的位置渲染错误页面
            errors[0] = toRouteError(getErrorTarget(path), err);
          } else {
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
          return json({ redirect: err.location, version });
        }
        return json({ data, error: errors.find(Boolean), version });
      });
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
   * 没有对应的 action 时响应 404；`submitAction` 提交时响应结果，
   * 原生表单提交时跳转到 `redirect` 的地址或者当前页面，出错时渲染错误页面，错误页面渲染在 action 所在的页面或 layout 的位置
   */
  const runAction = (template: string, request: Request, platform?: Platform) =>
    runInRequest(async () => {
      const url = setRequest(request, platform);
      const name = [...url.searchParams.keys()].find((key) => key.startsWith('/'))?.slice(1);
      const { lang, path } = await setLanguage(url.pathname);
      return runHandle(url, path, async (err) => {
        const found = name === undefined ? undefined : await findAction(path, name);
        if (!found) return new Response(null, { status: 404, headers: toHeaders() });
        let result: ActionResult;
        try {
          if (err !== undefined) throw err;
          const data = await found.action(createServerContext(found.tag, found.params));
          result = { type: 'success', data: toJSONValue(data) };
        } catch (err) {
          result =
            err instanceof Redirect
              ? { type: 'redirect', location: err.location }
              : { type: 'error', error: toRouteError(found.tag, err) };
        }
        if (request.headers.get('accept') === 'application/json')
          return Response.json(result, { headers: toHeaders() });
        if (result.type === 'error') return renderPage(template, url, lang, path, result.error);
        const location = result.type === 'redirect' ? result.location : url.pathname;
        return new Response(null, { status: 303, headers: toHeaders({ location }) });
      });
    });

  const elementsResult = (html: string[] | null, init: ResponseInit) =>
    Response.json({ html, version } satisfies ElementsResult, init);

  /**
   * 渲染页面中的纯服务端元素，请求体是 `{ url, elements }`，`url` 是页面的路径，
   * 响应元素的 HTML，顺序和 `elements` 一致，跳转时为 `null`，响应头中有跳转的地址，`handle` 出错时为 `null`
   */
  const renderElements = (request: Request, platform?: Platform) =>
    runInRequest(async () => {
      const url = setRequest(request, platform);
      const body: { url: string; elements: ServerElementParams[] } = await request.json();
      const { pathname, search } = new URL(body.url, url);
      const { path } = await setLanguage(pathname);
      return runHandle(new URL(`${url.origin}${pathname}${search}`), path, async (err) => {
        if (err instanceof Redirect) {
          return elementsResult(null, { headers: toHeaders({ [REDIRECT_HEADER]: err.location }) });
        }
        if (err !== undefined) return elementsResult(null, { status: toErrorData(err).status, headers: toHeaders() });
        // 元素在页面和 layout 的模块中定义
        await Promise.all(matchRoutes(path).map(({ info }) => info.load()));
        const options = { url: `${url.origin}${path}${search}` };
        const html = await Promise.all(
          body.elements.map(({ tag, attrs, props }) => renderServerElement(tag, attrs, props, options)),
        );
        return elementsResult(html, { headers: toHeaders() });
      });
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
   * 处理 API 路由的请求，处理函数返回 `Response`，其他值作为 JSON 响应，
   * `redirect` 响应跳转（`$gemkit/api` 的请求响应 `REDIRECT_HEADER`），`error` 响应 JSON 格式的错误，
   * 没有对应的请求方法时为 405
   */
  const runEndpoint = (request: Request, platform?: Platform) =>
    runInRequest(async () => {
      const url = setRequest(request, platform);
      const matched = matchEndpoint(url.pathname);
      if (!matched) return new Response(null, { status: 404 });
      const { endpoint, params, path } = matched;
      return runHandle(url, path, async (err) => {
        let response: Response;
        try {
          if (err !== undefined) throw err;
          const mod: EndpointModule = await endpoint.load();
          const method = (request.method === 'HEAD' ? 'GET' : request.method) as RequestMethod;
          const fn = Object.hasOwn(mod, method) ? mod[method] : undefined;
          if (!fn) {
            const allow = Object.keys(mod).filter((key) => /^[A-Z]+$/.test(key));
            return new Response(null, { status: 405, headers: toHeaders({ allow: allow.join(', ') }) });
          }
          const result = await fn(createServerContext(endpoint.pattern, params), await getInput(request, url));
          response = result instanceof Response ? result : Response.json(toJSONValue(result));
        } catch (err) {
          if (err instanceof Redirect) {
            // `fetch` 会自动跟随跳转，客户端拿不到跳转的地址
            if (request.headers.has(CLIENT_HEADER)) {
              return new Response(null, { headers: toHeaders({ [REDIRECT_HEADER]: err.location }) });
            }
            return redirectResponse(err);
          }
          const data = toErrorData(err);
          return Response.json(data, { status: data.status, headers: toHeaders() });
        }
        // 返回的响应头可能不可修改，例如 `Response.redirect`
        return new Response(request.method === 'HEAD' ? null : response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: toHeaders(response.headers),
        });
      });
    });

  /** 预渲染页面，不能预渲染时为 `undefined` */
  const prerenderDocument = async (
    template: string,
    pathname: string,
    options?: Pick<RenderOptions, 'serverElements'> & { platform?: Platform },
  ) => {
    try {
      return await renderDocument(template, pathname, options);
    } catch (err) {
      if (!(err instanceof NotPrerenderable)) throw err;
    }
  };

  /** 页面和 layout 的服务端模块中最小的 `revalidate`，都没有设置时页面不使用 ISR */
  const getRevalidate = async (pathname: string) => {
    const { path } = split(pathname);
    const modules = await Promise.all(findServerRoutes(path).map(({ tag }) => getServerModule(tag)));
    const values = modules.flatMap((mod) => (mod?.revalidate === undefined ? [] : [mod.revalidate]));
    return values.length ? Math.min(...values) : undefined;
  };

  /**
   * 需要预渲染的路径，静态路由和动态路由的 `*.server.ts` 或者页面的 `paths` 选项返回的路径，
   * 渲染时才能确定是否可以预渲染，见 `NotPrerenderable`
   */
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
      localized.push(...(languages.length ? paths.map((path) => localize(lang, path)) : paths));
      // 没有前缀的路径输出跳转页面，静态托管时也能跳转到默认语言
      if (prefixDefaultLanguage && lang === defaultLanguage) localized.push(...paths);
    }
    return localized;
  };

  /** 页面或 layout 是否有服务端数据，预渲染时需要输出数据文件 */
  const hasServerData = (path: string) => findServerRoutes(split(path).path).length > 0;

  /** 预渲染 404 页面时使用的路径，使用默认语言 */
  const notFoundPath = localize(defaultLanguage, '/__gemkit_404__');

  return {
    renderDocument,
    prerenderDocument,
    loadData,
    runAction,
    renderElements,
    matchEndpoint,
    runEndpoint,
    getPaths,
    getRevalidate,
    setRevalidateHandler,
    hasServerData,
    notFoundPath,
    version,
  };
}

export type Renderer = ReturnType<typeof createRenderer>;
