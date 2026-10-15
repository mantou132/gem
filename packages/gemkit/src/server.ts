// 必须在 Gem 之前执行，用来模拟 DOM 环境
import '@mantou/gem-ssr';

import { history, type TemplateResult, titleStore } from '@mantou/gem';
import { matchPath } from '@mantou/gem/elements/route';
import type { I18n } from '@mantou/gem/helper/i18n';
import { type RenderOptions, render, renderServerElement, runInRequest } from '@mantou/gem-ssr';

import { DATA_FILE, DATA_SCRIPT_ID, trimTrailingSlash } from './constants';
import {
  getServerModule,
  type RouteData,
  runServerLoad,
  type ServerElementParams,
  type ServerModule,
  setServerModules,
  ssrData,
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
  /** 页面的数据和标题确定后才开始输出，之后的异步内容（例如 `@server`）流式输出 */
  html: AsyncGenerator<string>;
}

const escapeHtml = (s: string) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');

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

  const setLanguage = async (pathname: string) => {
    const { lang, path } = splitLanguage(trimTrailingSlash(pathname), languages, defaultLanguage);
    history.basePath = getBasePath(lang, defaultLanguage);
    await i18n?.setLanguage(lang);
    return { lang, path };
  };

  /**
   * 处理客户端导航时的数据请求，`url` 是页面路径加上 `/__data.json`
   *
   * 返回路径匹配的 layout 和页面的服务端数据，key 是标签名
   */
  const loadData = (url: string) =>
    runInRequest(async () => {
      const { origin, pathname, search } = new URL(url, 'http://localhost');
      const pagePathname = pathname.slice(0, -DATA_FILE.length - 1) || '/';
      const { path } = await setLanguage(pagePathname);
      const pageUrl = new URL(`${origin}${pagePathname}${search}`);
      const data: RouteData = {};
      await Promise.all(
        findServerRoutes(path).map(async ({ tag, params }) => {
          if ((await getServerModule(tag))?.load) data[tag] = await runServerLoad(tag, params, pageUrl);
        }),
      );
      return Object.keys(data).length ? { status: 200, data } : { status: 404, data: null };
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
   * 预渲染时使用 `serverElements` 收集纯服务端元素的 HTML
   */
  const renderDocument = (
    template: string,
    url: string,
    { serverElements }: Pick<RenderOptions, 'serverElements'> = {},
  ) =>
    // 每个请求有独立的 history、i18n 和 store
    runInRequest(async (): Promise<RenderResult> => {
      const { origin, pathname, search } = new URL(url, 'http://localhost');
      const { lang, path } = await setLanguage(pathname);
      const chunks = render(app, { url: `${origin}${path}${search}`, serverElements });
      // 页面的数据和标题确定后再输出文档
      let body = '';
      while (!ssrData.ready) {
        const { done, value } = await chunks.next();
        if (done) break;
        body += value;
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
        html: (async function* () {
          yield start + body;
          yield* chunks;
          yield dataScript + end;
        })(),
      };
    });

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
    if (!languages.length) return paths;
    return languages.flatMap((lang) => paths.map((path) => localizePath(lang, path, defaultLanguage)));
  };

  /** 页面或 layout 是否有服务端数据，预渲染时需要输出数据文件 */
  const hasServerData = (path: string) =>
    findServerRoutes(splitLanguage(path, languages, defaultLanguage).path).length > 0;

  return { renderDocument, loadData, renderElements, getPaths, hasServerData };
}

export type Renderer = ReturnType<typeof createRenderer>;
