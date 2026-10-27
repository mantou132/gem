import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { Eta } from 'eta';

import type { TitleOptions } from '../title';

export interface GemkitConfig extends TitleOptions {
  /**
   * 页面、语言文件等源码的目录，相对于项目根目录，可以是其他包中的目录，例如由框架提供页面
   * @default 'src'
   */
  srcDir?: string;
  /** 默认语言，默认没有路径前缀，默认为 `en` 或者 `locales` 中的第一个语言 */
  defaultLanguage?: string;
  /** 默认语言也使用路径前缀，例如 `/en/about`，没有前缀的路径跳转到默认语言 */
  prefixDefaultLanguage?: boolean;
}

/**
 * 可以通过 `$gemkit/*` 导入的生成模块，其他生成文件是入口或内部模块，导入会产生副作用
 */
export const PUBLIC_MODULES = ['i18n', 'api'];

/** `$gemkit/*` 到生成文件的映射，供 alias 和 tsconfig `paths` 使用 */
export const getPublicModules = (genDir: string) =>
  Object.fromEntries(PUBLIC_MODULES.map((name) => [`$gemkit/${name}`, path.join(genDir, `${name}.ts`)]));

/** `<srcDir>` 的别名，元素自动导入等需要使用模块路径而不是文件路径 */
export const SRC_ALIAS = 'src';

interface PageNode {
  pattern: string;
  file: string;
  tag: string;
  /** 同名的 `*.server.ts` */
  server?: string;
}

/** 没有同名页面模块的 `*.server.ts`，处理 HTTP 请求 */
interface EndpointNode {
  pattern: string;
  file: string;
}

interface LayoutNode {
  tag: string;
  file?: string;
  /** 同名的 `_layout.server.ts` */
  server?: string;
  pages: PageNode[];
  layouts: { pattern: string; layout: LayoutNode }[];
}

const MODULE_EXT = /\.[cm]?[jt]s$/;

const isModule = (name: string) => MODULE_EXT.test(name) && !/\.d\.[cm]?ts$|\.(test|spec)\./.test(name);

const isServerModule = (name: string) => /\.server\.[cm]?[jt]s$/.test(name);

const findModule = (dir: string, name: string) =>
  fs.readdirSync(dir).find((file) => isModule(file) && file.replace(MODULE_EXT, '') === name);

const findServerModule = (file: string) => {
  const dir = path.dirname(file);
  const serverFile = findModule(dir, `${path.basename(file).replace(MODULE_EXT, '')}.server`);
  return serverFile && path.join(dir, serverFile);
};

// `[id]` -> `:id`, `[...rest]` -> `*`
function toSegment(name: string) {
  if (/^\[\.\.\..+\]$/.test(name)) return '*';
  const param = name.match(/^\[(.+)\]$/);
  return param ? `:${param[1]}` : name;
}

function toTag(type: 'page' | 'layout', relPath: string) {
  const name = relPath
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `gemkit-${type}-${name || 'root'}`;
}

// 静态片段优先，其次是参数，最后是 `*`
// `*` 能匹配空片段，所以缺少的片段排在 `*` 之前，例如 `/` 先于 `/*`
function rankPattern(pattern: string) {
  return pattern
    .split('/')
    .filter(Boolean)
    .map((seg) => (seg === '*' ? 0 : seg.startsWith(':') ? 2 : 3));
}

function comparePattern(a: string, b: string) {
  const [ra, rb] = [rankPattern(a), rankPattern(b)];
  for (let i = 0; i < Math.max(ra.length, rb.length); i++) {
    if (ra[i] !== rb[i]) return (rb[i] ?? 1) - (ra[i] ?? 1);
  }
  return 0;
}

function scanDir(
  pagesDir: string,
  dir: string,
  segments: string[],
  layout: LayoutNode,
  tags: Map<string, string>,
  endpoints: EndpointNode[],
) {
  const addTag = (tag: string, file: string) => {
    if (tags.has(tag)) throw new Error(`gemkit: \`${file}\` and \`${tags.get(tag)}\` have the same tag \`${tag}\``);
    tags.set(tag, file);
    return tag;
  };
  const entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    // `_` 开头的是特殊文件或者非页面模块
    if (/^[._]/.test(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(pagesDir, fullPath);
    if (entry.isDirectory()) {
      const subSegments = [...segments, toSegment(entry.name)];
      const layoutFile = findModule(fullPath, '_layout');
      if (!layoutFile) {
        scanDir(pagesDir, fullPath, subSegments, layout, tags, endpoints);
        continue;
      }
      const file = path.join(fullPath, layoutFile);
      const subLayout: LayoutNode = {
        tag: addTag(toTag('layout', relPath), file),
        file,
        server: findServerModule(file),
        pages: [],
        layouts: [],
      };
      layout.layouts.push({ pattern: `/${[...subSegments, '*'].join('/')}`, layout: subLayout });
      scanDir(pagesDir, fullPath, subSegments, subLayout, tags, endpoints);
    } else if (isModule(entry.name) && !isServerModule(entry.name)) {
      const name = entry.name.replace(MODULE_EXT, '');
      const pageSegments = name === 'index' ? segments : [...segments, toSegment(name)];
      layout.pages.push({
        pattern: `/${pageSegments.join('/')}`,
        file: fullPath,
        tag: addTag(toTag('page', relPath.replace(MODULE_EXT, '')), fullPath),
        server: findServerModule(fullPath),
      });
    } else if (isModule(entry.name)) {
      const name = entry.name.replace(MODULE_EXT, '').replace(/\.server$/, '');
      // 有同名页面模块时是页面的服务端模块
      if (findModule(dir, name)) continue;
      const endpointSegments = name === 'index' ? segments : [...segments, toSegment(name)];
      endpoints.push({ pattern: `/${endpointSegments.join('/')}`, file: fullPath });
    }
  }
}

// 参数名不影响匹配，`/blog/:id` 和 `/blog/:slug` 是同一个路径
const normalizePattern = (pattern: string) => pattern.replace(/:[^/]+/g, ':');

/** API 路由先于页面匹配，路径相同时页面只能通过客户端导航访问 */
function checkConflicts(root: LayoutNode, endpoints: EndpointNode[]) {
  const pages = new Map<string, string>();
  const collect = (layout: LayoutNode) => {
    for (const { pattern, file } of layout.pages) pages.set(normalizePattern(pattern), file);
    for (const { layout: sub } of layout.layouts) collect(sub);
  };
  collect(root);
  for (const { pattern, file } of endpoints) {
    const page = pages.get(normalizePattern(pattern));
    if (page) throw new Error(`gemkit: \`${file}\` and \`${page}\` have the same path \`${pattern}\``);
  }
}

export function scanPages(pagesDir: string) {
  const tags = new Map<string, string>();
  const endpoints: EndpointNode[] = [];
  const rootLayout = findModule(pagesDir, '_layout');
  const error = findModule(pagesDir, '_error');
  const rootFile = rootLayout && path.join(pagesDir, rootLayout);
  const root: LayoutNode = {
    tag: rootLayout ? toTag('layout', '') : '',
    file: rootFile,
    server: rootFile && findServerModule(rootFile),
    pages: [],
    layouts: [],
  };
  scanDir(pagesDir, pagesDir, [], root, tags, endpoints);
  checkConflicts(root, endpoints);
  endpoints.sort((a, b) => comparePattern(a.pattern, b.pattern));
  // 错误页面的数据是错误，没有服务端模块
  return { root, endpoints, error: error && { file: path.join(pagesDir, error), tag: toTag('page', 'error') } };
}

function writeIfChanged(file: string, content: string) {
  if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === content) return;
  fs.writeFileSync(file, content);
}

const HEADER = '// Generated by gemkit, do not edit\n';

// 生成的是 JS 代码，不需要转义；控制语句使用 `-%>` 去掉换行
const eta = new Eta({
  views: fileURLToPath(new URL('templates', import.meta.url)),
  autoEscape: false,
  autoTrim: false,
});

const render = (genDir: string, file: string, template: string, data: object) =>
  writeIfChanged(path.join(genDir, file), eta.render(template, data));

const toImportPath = (genDir: string, file: string) =>
  JSON.stringify(path.relative(genDir, file).replace(MODULE_EXT, ''));

/** 生成路由，返回有服务端模块的 layout 和页面，以及 API 路由 */
function generateRoutes(genDir: string, pagesDir: string) {
  const { root, endpoints, error } = scanPages(pagesDir);
  const importPath = (file: string) => toImportPath(genDir, file);

  // 客户端产物不能引用 `*.server.ts`，只传递是否有服务端模块
  const pageRoute = ({ pattern, file, tag, server }: PageNode) => ({
    pattern,
    tag,
    path: importPath(file),
    server: !!server,
  });
  const layoutRoute = (pattern: string, { file, tag, server }: LayoutNode) => ({
    pattern,
    tag,
    path: importPath(file!),
    server: !!server,
    layout: true,
  });

  // 有服务端模块的 layout 和页面，服务端入口使用
  const serverRoutes: { tag: string; server: string }[] = [];
  const addServerRoute = ({ tag, server }: { tag: string; server?: string }) =>
    server && serverRoutes.push({ tag, server });
  const outlets: { tag: string; routes: object[]; error: boolean }[] = [];
  // 根 layout 也通过路由加载，这样可以和其他 layout 一样加载数据
  if (root.file) {
    // 根 layout 没有 `path`，使用静态导入的模块
    outlets.push({ tag: '', routes: [{ ...layoutRoute('*', root), path: undefined }], error: false });
    addServerRoute(root);
  }
  const collect = (layout: LayoutNode) => {
    layout.pages.forEach(addServerRoute);
    layout.layouts.forEach(({ layout: sub }) => addServerRoute(sub));
    const routes = [
      ...layout.pages.map(pageRoute),
      ...layout.layouts.map(({ pattern, layout: sub }) => layoutRoute(pattern, sub)),
    ].sort((a, b) => comparePattern(a.pattern, b.pattern));
    outlets.push({ tag: layout.tag, routes, error: !!error });
    layout.layouts.forEach(({ layout: sub }) => collect(sub));
  };
  collect(root);

  render(genDir, 'routes.ts', 'routes', {
    rootLayout: root.file && importPath(root.file),
    error: error && { tag: error.tag, path: importPath(error.file), isError: true },
    outlets,
  });
  return { serverRoutes, endpoints };
}

interface ApiNode {
  /** 路径对应的 API 路由模块的序号 */
  module?: number;
  /** 静态部分，`:name` 是参数，`*` 是剩余参数 */
  children: Map<string, ApiNode>;
}

/** API 路由的路径树转换成 `apis` 的类型，属性是静态部分，调用签名是参数 */
function toApiType({ module, children }: ApiNode, indent: string): string {
  const inner = `${indent}  `;
  const members = [...children].map(([segment, child]) => {
    const type = toApiType(child, inner);
    if (segment === '*') return `${inner}(...path: string[]): ${type};`;
    if (segment.startsWith(':')) return `${inner}(${segment.slice(1)}: string): ${type};`;
    return `${inner}${JSON.stringify(segment)}: ${type};`;
  });
  const types = [];
  if (module !== undefined) types.push(`EndpointMethods<typeof endpoint${module}>`);
  if (members.length) types.push(`{\n${members.join('\n')}\n${indent}}`);
  return types.join(' & ') || '{}';
}

/** 生成 `$gemkit/api`，按路径调用 API 路由，只引用服务端模块的类型 */
function generateApi(genDir: string, endpoints: EndpointNode[]) {
  const root: ApiNode = { children: new Map() };
  endpoints.forEach(({ pattern }, index) => {
    let node = root;
    for (const segment of pattern.split('/').filter(Boolean)) {
      if (!node.children.has(segment)) node.children.set(segment, { children: new Map() });
      node = node.children.get(segment)!;
    }
    node.module = index;
  });
  render(genDir, 'api.ts', 'api', {
    modules: endpoints.map(({ file }) => toImportPath(genDir, file)),
    type: toApiType(root, ''),
  });
}

function generateI18n(genDir: string, localesDir: string, config: GemkitConfig) {
  const languages = fs.existsSync(localesDir)
    ? fs
        .readdirSync(localesDir)
        .filter((file) => file.endsWith('.json'))
        .map((file) => file.replace(/\.json$/, ''))
        .sort()
    : [];
  const defaultLanguage = config.defaultLanguage || (languages.includes('en') ? 'en' : languages[0]);
  if (languages.length && !languages.includes(defaultLanguage))
    throw new Error(
      `gemkit: not found \`${path.relative(path.dirname(genDir), path.join(localesDir, defaultLanguage))}.json\``,
    );
  render(genDir, 'i18n.ts', 'i18n', {
    languages: languages.map((lang) => ({
      lang,
      path: JSON.stringify(path.relative(genDir, path.join(localesDir, `${lang}.json`))),
    })),
    defaultLanguage,
    prefixDefaultLanguage: !!config.prefixDefaultLanguage,
  });
}

// unplugin-gem 的 `?preload`：图片得到已加载的 URL，其他资源得到内容
// 多个通配模块匹配时 TS 取先声明的，所以图片要在 `*?preload` 之前
const preloadDts = `${['svg', 'gif', 'jpg', 'jpeg', 'tif', 'tiff', 'png', 'apng', 'webp', 'avif', 'bmp']
  .map((ext) => `declare module '*.${ext}?preload' {\n  const url: string;\n  export default url;\n}\n`)
  .join('')}declare module '*?preload' {\n  const data: ArrayBuffer;\n  export default data;\n}\n`;

function generateEntries(
  genDir: string,
  srcDir: string,
  config: GemkitConfig,
  { serverRoutes, endpoints }: ReturnType<typeof generateRoutes>,
) {
  const importPath = (file: string) => toImportPath(genDir, file);
  const appFile = findModule(srcDir, 'app');
  const data = {
    app: appFile && importPath(path.join(srcDir, appFile)),
    titleOptions: { title: config.title, titleTemplate: config.titleTemplate },
  };
  render(genDir, 'client.ts', 'client', data);
  const appServerFile = findModule(srcDir, 'app.server');
  render(genDir, 'server.ts', 'server', {
    ...data,
    appServer: appServerFile && importPath(path.join(srcDir, appServerFile)),
    serverModules: serverRoutes.map(({ tag, server }) => ({ tag, path: importPath(server) })),
    endpoints: endpoints.map(({ pattern, file }) => ({ pattern, path: importPath(file) })),
  });
  writeIfChanged(
    path.join(genDir, 'tsconfig.json'),
    // 通过 `files` 包含声明文件，不依赖项目的 `include`（`.` 开头的目录不会被通配符匹配）
    // `auto-import.d.ts` 由 unplugin-gem 生成
    `${JSON.stringify(
      {
        compilerOptions: {
          paths: {
            ...Object.fromEntries(PUBLIC_MODULES.map((name) => [`$gemkit/${name}`, [`./${name}.ts`]])),
            [`${SRC_ALIAS}/*`]: [`${path.relative(genDir, srcDir).replaceAll(path.sep, '/')}/*`],
          },
        },
        files: ['./env.d.ts', './auto-import.d.ts'],
      },
      null,
      2,
    )}\n`,
  );
  // CSS 等资源模块的类型声明，项目不需要自己引用
  writeIfChanged(
    path.join(genDir, 'env.d.ts'),
    `${HEADER}/// <reference types="@rsbuild/core/types" />\n\n${preloadDts}`,
  );
}

/**
 * 部署平台的函数入口，服务端构建的 `handler` 入口；
 * 产物是 CommonJS，使用命名导出，Node.js 的 ESM 和打包工具都能识别
 */
export function generateHandler(rootPath: string, runtime: string) {
  const genDir = path.join(rootPath, '.gemkit');
  render(genDir, 'handler.ts', 'handler.eta', { runtime: JSON.stringify(runtime) });
  return path.join(genDir, 'handler.ts');
}

export const getSrcDir = (rootPath: string, config: GemkitConfig) => path.resolve(rootPath, config.srcDir ?? 'src');

/** 生成路由、i18n 和入口文件到 `.gemkit` 目录 */
export function generate(rootPath: string, config: GemkitConfig) {
  const srcDir = getSrcDir(rootPath, config);
  const genDir = path.join(rootPath, '.gemkit');
  fs.mkdirSync(genDir, { recursive: true });
  // 生成的内容不需要提交，项目不用自己配置 `.gitignore`
  writeIfChanged(path.join(genDir, '.gitignore'), '*\n');
  const routes = generateRoutes(genDir, path.join(srcDir, 'pages'));
  generateI18n(genDir, path.join(srcDir, 'locales'), config);
  generateEntries(genDir, srcDir, config, routes);
  generateApi(genDir, routes.endpoints);
}
