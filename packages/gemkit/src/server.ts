// 必须在 Gem 之前执行，用来模拟 DOM 环境
import '@mantou/gem-ssr';

import { history, type TemplateResult, titleStore } from '@mantou/gem';
import { matchPath } from '@mantou/gem/elements/route';
import type { I18n } from '@mantou/gem/helper/i18n';
import { renderToString, runInRequest } from '@mantou/gem-ssr';

import { DATA_FILE, DATA_SCRIPT_ID, trimTrailingSlash } from './constants';
import { getServerModule, runServerLoad, type ServerModule, setServerModules, ssrData } from './data';
import { getBasePath, localizePath, splitLanguage } from './i18n';
import { getPageOptions, type Params } from './page';
import { formatTitle, type TitleOptions } from './title';

export interface PageEntry {
  pattern: string;
  tag: string;
  load: () => Promise<{ default: CustomElementConstructor }>;
}

export interface RendererOptions extends TitleOptions {
  app: TemplateResult;
  /** 按匹配优先级排序 */
  pages: PageEntry[];
  /** 页面标签名对应的 `*.server.ts` */
  serverModules?: Record<string, () => Promise<ServerModule>>;
  i18n?: I18n<any>;
  languages?: string[];
  defaultLanguage?: string;
}

export interface RenderResult {
  status: number;
  lang?: string;
  title: string;
  body: string;
  /** 服务端数据，水合时使用 */
  data?: { path: string; data: unknown };
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

  const setLanguage = async (pathname: string) => {
    const { lang, path } = splitLanguage(trimTrailingSlash(pathname), languages, defaultLanguage);
    history.basePath = getBasePath(lang, defaultLanguage);
    await i18n?.setLanguage(lang);
    return { lang, path };
  };

  // 每个请求有独立的 history、i18n 和 store
  const render = (url: string) =>
    runInRequest(async (): Promise<RenderResult> => {
      const { origin, pathname, search } = new URL(url, 'http://localhost');
      const { lang, path } = await setLanguage(pathname);
      const body = await renderToString(app, { url: `${origin}${path}${search}` });
      return {
        status: findPage(path) ? 200 : 404,
        lang: lang || undefined,
        title: formatTitle(titleStore.title, titleOptions),
        body,
        data: ssrData.current,
      };
    });

  /** 处理客户端导航时的数据请求，`url` 是页面路径加上 `/__data.json` */
  const loadData = (url: string) =>
    runInRequest(async () => {
      const { origin, pathname, search } = new URL(url, 'http://localhost');
      const pagePathname = pathname.slice(0, -DATA_FILE.length - 1) || '/';
      const { path } = await setLanguage(pagePathname);
      const result = findPage(path);
      if (!result || !(await getServerModule(result.page.tag))?.load) return { status: 404, data: null };
      const data = await runServerLoad(result.page.tag, result.params, new URL(`${origin}${pagePathname}${search}`));
      return { status: 200, data };
    });

  /** 将渲染结果插入 HTML 模版，模版中使用 `<!--gemkit-body-->` 标记内容位置 */
  const renderDocument = async (template: string, url: string) => {
    const { status, lang, title, body, data } = await render(url);
    // 避免内容中的 `</script>` 结束标签
    const dataScript =
      data &&
      `<script type="application/json" id="${DATA_SCRIPT_ID}">${JSON.stringify(data).replaceAll('<', '\\u003c')}</script>`;
    let html = template
      .replace('<!--gemkit-body-->', () => body + (dataScript || ''))
      .replace(/<title>[\s\S]*?<\/title>/, () => `<title>${escapeHtml(title)}</title>`);
    if (lang) {
      html = html.replace(
        /<html([^>]*)>/,
        (_, attrs: string) => `<html${attrs.replace(/\s+lang="[^"]*"/, '')} lang="${lang}">`,
      );
    }
    return { status, html };
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
    if (!languages.length) return paths;
    return languages.flatMap((lang) => paths.map((path) => localizePath(lang, path, defaultLanguage)));
  };

  /** 页面是否有服务端数据，预渲染时需要输出数据文件 */
  const hasServerData = (path: string) => {
    const { path: pagePath } = splitLanguage(path, languages, defaultLanguage);
    const result = findPage(pagePath);
    return !!result && result.page.tag in serverModules;
  };

  return { render, renderDocument, loadData, getPaths, hasServerData };
}

export type Renderer = ReturnType<typeof createRenderer>;
