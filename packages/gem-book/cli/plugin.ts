import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { pluginGemkit } from '@mantou/gemkit/plugin';
import type { RsbuildPlugin, RsbuildPlugins } from '@rsbuild/core';

import { defaultTheme, toThemeProp } from '../app/lib/default-theme.ts';
// https://developers.google.com/search/docs/advanced/crawling/localized-versions#language-codes
import langNames from '../app/lib/lang.json' with { type: 'json' };
import type { SiteConfig } from '../app/lib/types.ts';
import type { GemBookConfig } from './config.ts';

/** gem-book 内置的页面、元素和语言文件 */
const appDir = fileURLToPath(new URL('../app', import.meta.url));

/** 生成的 gemkit 源码目录，在项目目录中 */
const SRC_DIR = '.gem-book';

const resolveDir = (specifier: string) => path.dirname(fileURLToPath(import.meta.resolve(specifier)));

const isURL = (s: string) => /^(https?:)?\/\//.test(s);

const toPosix = (file: string) => file.replaceAll(path.sep, '/');

/** 生成的模块中导入其他文件使用的相对路径 */
const toImportPath = (from: string, file: string) => {
  const rel = toPosix(path.relative(from, file));
  return JSON.stringify(rel.startsWith('.') ? rel : `./${rel}`);
};

const writeIfChanged = (file: string, content: string) => {
  if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === content) return;
  fs.writeFileSync(file, content);
};

// 属性值中可能有 `>`，例如 `<gbp-example>` 的 `props='{"@click": "() => {}"}'`
const PLUGIN_TAG_REG = /<gbp-(import|example)\b((?:[^>"']|"[^"]*"|'[^']*')*)>/g;

const getAttr = (attrs: string, name: string) => attrs.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1] || '';

/** 文档目录中的 Markdown 文件，文档目录可能是项目目录 */
const getMdFiles = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'node_modules' || entry.name.startsWith('.') ? [] : getMdFiles(file);
    return entry.name.endsWith('.md') ? [file] : [];
  });

const applyImportMap = (importMap: Record<string, string>, specifier: string) => {
  const prefix = Object.keys(importMap).find((key) => specifier.startsWith(key));
  return prefix && importMap[prefix] + specifier.slice(prefix.length);
};

/**
 * `GEM_BOOK_REPLACE` 时 esm.sh 的模块使用 `importMap` 替换成本地文件，例如开发 UI 库时直接使用源码，
 * `https://esm.sh/duoyun-ui@1/elements/button` => `duoyun-ui/elements/button`
 */
function replaceUrl(rootPath: string, importMap: Record<string, string>, url: string) {
  const { host, pathname } = new URL(url);
  if (host !== 'esm.sh') return;
  const mapped = applyImportMap(importMap, pathname.slice(1).replace(/^((?:@[^/]+\/)?[^/@]+)@[^/]+/, '$1'));
  if (!mapped) return;
  const base = path.resolve(rootPath, mapped);
  return ['.ts', '.js', '/index.ts', '']
    .map((ext) => base + ext)
    .find((file) => fs.statSync(file, { throwIfNoEntry: false })?.isFile());
}

/**
 * 文档中 `<gbp-import>` 导入的本地文件，key 是服务端渲染的 `src`（相对于项目目录的路径），
 * `src` 相对于文档（`.` 开头）或者项目目录，`dependencies` 指定的版本，例如 `canvas-confetti, lodash@4`；
 * `replace` 时还有 `<gbp-import>` 和 `<gbp-example>` 中替换的 esm.sh 模块，key 是网址
 */
function getLocalImports(rootPath: string, docsDir: string, importMap: Record<string, string>, replace: boolean) {
  const imports = new Map<string, string>();
  const replaced = new Set<string>();
  const versions: Record<string, string> = {};
  for (const file of getMdFiles(docsDir)) {
    for (const [, tag, attrs] of fs.readFileSync(file, 'utf8').matchAll(PLUGIN_TAG_REG)) {
      const src = getAttr(attrs, 'src');
      // `<gbp-example>` 可以有多个模块
      const srcList = (tag === 'example' ? src.split(',') : [src]).map((e) => e.trim()).filter(Boolean);
      for (const item of srcList) {
        if (isURL(item)) {
          const target = replace && replaceUrl(rootPath, importMap, item);
          if (target) {
            imports.set(item, target);
            replaced.add(target);
          }
          continue;
        }
        if (tag !== 'import') continue;
        const target = item.startsWith('.')
          ? path.resolve(path.dirname(file), item)
          : path.resolve(rootPath, applyImportMap(importMap, item) || item);
        // 代码块中的示例可能不存在
        if (fs.existsSync(target)) imports.set(toPosix(path.relative(rootPath, target)), target);
      }
      for (const dep of getAttr(attrs, 'dependencies').split(',')) {
        const [name, version] = dep.trim().split(/(?<=.)@/);
        if (name && version) versions[name] = version;
      }
    }
  }
  return { imports, replaced, versions };
}

/** 包名，例如 `@scope/name/sub` => `@scope/name` */
const getPackageName = (specifier: string) =>
  specifier
    .split('/')
    .slice(0, specifier.startsWith('@') ? 2 : 1)
    .join('/');

/**
 * 本地的 `<gbp-import>` 模块和网站一起打包，使用网站的 Gem，其他依赖从 esm.sh 加载，项目不需要安装，
 * 同目录中被导入的文件也一样
 */
const externalDeps =
  (dirs: string[], versions: Record<string, string>) =>
  async ({ request, contextInfo }: { request?: string; contextInfo?: { issuer: string } }) => {
    const issuer = contextInfo?.issuer;
    // 网站的 Gem、插件 API 和编译生成的辅助函数需要打包
    if (
      !request ||
      !issuer ||
      /^[./$]|^@mantou\/|^gem-book\/plugin|^@swc\/helpers\/|^node:/.test(request) ||
      isURL(request)
    )
      return;
    if (/[\\/](node_modules|\.gem-book|\.gemkit)[\\/]/.test(issuer)) return;
    if (!dirs.some((dir) => issuer.startsWith(dir + path.sep))) return;
    const name = getPackageName(request);
    const version = versions[name];
    return `import https://esm.sh/${version ? `${name}@${version}` : name}${request.slice(name.length)}`;
  };

/** 全站插件：项目中的文件或者包 */
const resolvePlugin = (rootPath: string, plugin: string) => {
  const file = path.resolve(rootPath, plugin);
  return fs.existsSync(file) ? file : plugin;
};

/**
 * gemkit 在客户端和服务端的入口中导入 `app.ts`：导入全站插件，
 * 注册本地的 `<gbp-import>` 模块，在使用时才加载，key 和服务端渲染的 `src` 一致
 */
function generateApp(srcDir: string, plugins: string[], localImports: Map<string, string>) {
  const imports = plugins.map(
    (plugin) => `import ${path.isAbsolute(plugin) ? toImportPath(srcDir, plugin) : JSON.stringify(plugin)};`,
  );
  const registers = [...localImports].map(
    ([key, file]) => `localImports.set(${JSON.stringify(key)}, () => import(${toImportPath(srcDir, file)}));`,
  );
  const lines = [`import { localImports } from ${toImportPath(srcDir, path.join(appDir, 'lib/imports'))};`, ...imports];
  if (registers.length) lines.push('', ...registers);
  writeIfChanged(path.join(srcDir, 'app.ts'), `${lines.join('\n')}\n`);
}

export interface GemBookOptions extends Omit<GemBookConfig, 'title' | 'theme' | 'port'> {
  /** 文档目录，相对于项目目录，也是静态资源目录 */
  docsDir: string;
  title: string;
  /** 主题的值，覆盖默认主题 */
  theme?: Partial<typeof defaultTheme>;
}

interface HtmlFile {
  /** 页面路径，例如 `/en/guide` */
  page: string;
  file: string;
  html: string;
  /** gemkit 和 frontmatter 的跳转页面 */
  redirect: boolean;
}

/** 预渲染的页面，不包括搜索索引 */
function getHtmlFiles(webDir: string, dir = webDir): HtmlFile[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'search-index' ? [] : getHtmlFiles(webDir, file);
    if (entry.name !== 'index.html') return [];
    const html = fs.readFileSync(file, 'utf8');
    const page = `/${toPosix(path.relative(webDir, dir))}`;
    return { page, file, html, redirect: html.includes('http-equiv="refresh"') };
  });
}

/** 预渲染的页面，不包括跳转页面 */
const getPages = (webDir: string) =>
  getHtmlFiles(webDir)
    .filter(({ redirect }) => !redirect)
    .map(({ page }) => page);

interface SeoOptions {
  languages: string[];
  defaultLanguage: string;
  i18n: boolean;
  site?: string;
}

/**
 * 页面的 `<link rel="canonical">` 和其他语言的 `<link rel="alternate" hreflang>`，配置了 `site` 时是完整的网址；
 * 没有语言前缀的跳转页面由 gemkit 根据用户的语言跳转
 */
function writeSeo(webDir: string, { languages, defaultLanguage, i18n, site }: SeoOptions) {
  const files = getHtmlFiles(webDir).filter(({ redirect }) => !redirect);
  const pages = new Set(files.map(({ page }) => page));
  const toUrl = (page: string) => (site ? new URL(page, site).href : page);
  /** 页面在各个语言中的路径，`rest` 是不包括语言前缀的路径 */
  const getLocalized = (rest: string) =>
    languages
      .map((lang) => ({ lang, page: rest === '/' ? `/${lang}` : `/${lang}${rest}` }))
      .filter(({ page }) => pages.has(page));
  for (const { page, file, html } of files) {
    const [, first] = page.split('/');
    const rest = page.slice(first.length + 1) || '/';
    const links = [`<link rel="canonical" href="${toUrl(page)}">`];
    const alternates = i18n && languages.includes(first) ? getLocalized(rest) : [];
    if (alternates.length > 1) {
      links.push(
        ...alternates.map(({ lang, page: href }) => `<link rel="alternate" hreflang="${lang}" href="${toUrl(href)}">`),
      );
      const fallback = alternates.find(({ lang }) => lang === defaultLanguage);
      if (fallback) links.push(`<link rel="alternate" hreflang="x-default" href="${toUrl(fallback.page)}">`);
    }
    fs.writeFileSync(file, html.replace('</head>', `${links.join('')}</head>`));
  }
}

function writeSitemap(webDir: string, site: string) {
  const urls = getPages(webDir).map((page) => `  <url><loc>${new URL(page, site).href}</loc></url>`);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`;
  fs.writeFileSync(path.join(webDir, 'sitemap.xml'), xml);
}

/**
 * 把 `llms` 页面的数据文件输出成 `llms.txt`、`llms-full.txt` 和每个页面的 `.md`，
 * 多语言时根目录的 `llms.txt` 是默认语言的
 */
function writeLlms(webDir: string, languages: string[], defaultLanguage: string, i18n: boolean) {
  for (const lang of languages) {
    const langDir = i18n ? path.join(webDir, lang) : webDir;
    const dataDir = path.join(langDir, 'llms');
    const data = JSON.parse(fs.readFileSync(path.join(dataDir, '__data.json'), 'utf8')).data['gemkit-page-llms'];
    const files: Record<string, string> = { ...data.pages, '/llms.txt': data.index, '/llms-full.txt': data.full };
    if (i18n) {
      files[`/${lang}/llms.txt`] = data.index;
      files[`/${lang}/llms-full.txt`] = data.full;
      if (lang !== defaultLanguage) {
        delete files['/llms.txt'];
        delete files['/llms-full.txt'];
      }
    }
    for (const [pathname, content] of Object.entries(files)) {
      const file = path.join(webDir, pathname);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, content);
    }
    fs.rmSync(dataDir, { recursive: true });
  }
  // 没有语言前缀的跳转页面
  if (i18n) fs.rmSync(path.join(webDir, 'llms'), { recursive: true, force: true });
}

/** 文档目录中以语言代码命名的子目录 */
const getLanguages = (docsDir: string) =>
  fs
    .readdirSync(docsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name in langNames)
    .map(({ name }) => name);

/** HTML 模版，主题变量和页面级的样式直接写在模版中，服务端渲染时也能生效 */
const getTemplate = (theme: typeof defaultTheme) => `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="${theme.backgroundColor}">
    <title></title>
    <style>
      :root {
        ${Object.entries(theme)
          .map(([key, value]) => `${toThemeProp(key)}: ${value};`)
          .join('\n        ')}
      }
      html {
        color-scheme: var(--gem-book-color-scheme);
        background: var(--gem-book-background-color);
        color: var(--gem-book-text-color);
        font: 16px/1.7 var(--gem-book-font);
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
      body {
        margin: 0;
      }
      ::selection {
        background: rgb(from var(--gem-book-primary-color) r g b / 0.3);
      }
      :where(:focus-visible) {
        outline: 2px solid var(--gem-book-primary-color);
        outline-offset: -2px;
      }
    </style>
  </head>
  <body>
    <!--gemkit-body-->
  </body>
</html>
`;

/**
 * 生成 gemkit 的源码目录：页面导出 gem-book 内置的页面，语言文件根据文档的语言生成，
 * 不能直接使用 `app` 目录，因为语言由项目的文档决定
 */
function generateSrc(srcDir: string, languages: string[], theme: typeof defaultTheme) {
  fs.rmSync(srcDir, { recursive: true, force: true });
  fs.mkdirSync(path.join(srcDir, 'pages'), { recursive: true });
  fs.mkdirSync(path.join(srcDir, 'locales'));
  // 生成的内容不需要提交
  fs.writeFileSync(path.join(srcDir, '.gitignore'), '*\n');
  fs.writeFileSync(path.join(srcDir, 'index.html'), getTemplate(theme));
  for (const file of fs.readdirSync(path.join(appDir, 'pages'))) {
    const target = path
      .relative(path.join(srcDir, 'pages'), path.join(appDir, 'pages', file))
      .replaceAll(path.sep, '/');
    const specifier = JSON.stringify(target.replace(/\.ts$/, ''));
    // `*.server.ts` 没有默认导出
    const content = file.includes('.server.')
      ? `export * from ${specifier};\n`
      : `export { default } from ${specifier};\n`;
    fs.writeFileSync(path.join(srcDir, 'pages', file), content);
  }
  for (const lang of languages) {
    const file = path.join(appDir, 'locales', `${lang}.json`);
    const source = fs.existsSync(file) ? file : path.join(appDir, 'locales', 'en.json');
    fs.copyFileSync(source, path.join(srcDir, 'locales', `${lang}.json`));
  }
}

export function pluginGemBook(options: GemBookOptions): RsbuildPlugins {
  const {
    docsDir,
    title,
    i18n = false,
    fallbackLanguage,
    icon,
    nav = [],
    footer = '',
    theme = {},
    global = {},
    importMap = {},
  } = options;
  // gemkit 的插件需要在创建时指定 unplugin-gem 处理的文件，Rsbuild 的项目目录默认是 cwd
  const rootPath = process.cwd();
  const docs = path.resolve(rootPath, docsDir);
  const plugins = (options.plugins || []).map((plugin) => resolvePlugin(rootPath, plugin));
  // 开发时新增的本地模块需要重启才能被 unplugin-gem 处理
  // 开发 UI 库时使用源码，例如 `GEM_BOOK_REPLACE=true gem-book docs`
  const replace = !!process.env.GEM_BOOK_REPLACE;
  const { imports: localImports, replaced, versions } = getLocalImports(rootPath, docs, importMap, replace);
  const localFiles = [...localImports.values()];
  // 替换的源码使用项目安装的依赖
  const externals = externalDeps(
    [...new Set(localFiles.filter((file) => !replaced.has(file)).map((file) => path.dirname(file)))],
    versions,
  );
  // 替换的源码导入的其他文件也需要 unplugin-gem 处理，pnpm 的包是符号链接，使用真实路径
  const replacedDirs = replace
    ? Object.values(importMap).flatMap((dir) => {
        const target = path.resolve(rootPath, dir);
        return fs.existsSync(target) ? [fs.realpathSync(target)] : [];
      })
    : [];
  const plugin: RsbuildPlugin = {
    name: 'gem-book',
    setup(api) {
      const srcDir = path.join(rootPath, SRC_DIR);
      // 没有开启多语言时只有一个语言，文档在根目录
      const languages = i18n ? getLanguages(docs) : [fallbackLanguage || 'en'];
      generateSrc(srcDir, languages, { ...defaultTheme, ...theme });
      generateApp(srcDir, plugins, localImports);
      // 文档中增删 `<gbp-import>` 时更新
      if (api.context.action === 'dev') {
        const watcher = fs.watch(docs, { recursive: true }, (_, filename) => {
          if (filename?.endsWith('.md'))
            generateApp(srcDir, plugins, getLocalImports(rootPath, docs, importMap, replace).imports);
        });
        api.onCloseDevServer(() => watcher.close());
      }
      const iconFile = icon && !isURL(icon) ? path.resolve(rootPath, icon) : undefined;
      const config: SiteConfig = {
        title,
        // 本地图标作为 favicon 输出到根目录
        icon: iconFile ? `/${path.basename(iconFile)}` : icon,
        i18n,
        displayRank: !!options.displayRank,
        homeMode: !!options.homeMode,
        versions: options.versions || [],
        github: options.github,
        sourceBranch: options.sourceBranch || 'main',
        docsearch: options.docsearch,
        comment: options.comment,
        // 开发时不统计
        ga: api.context.action === 'build' ? options.ga : undefined,
      };
      const webDir = path.join(rootPath, 'dist/web');
      // 和 gemkit 的默认语言一致
      const defaultLanguage = fallbackLanguage || (languages.includes('en') ? 'en' : languages[0]);
      // 在 gemkit 预渲染之后执行
      api.onAfterBuild({ order: 'post', handler: () => writeLlms(webDir, languages, defaultLanguage, i18n) });
      api.onAfterBuild({
        order: 'post',
        handler: () => writeSeo(webDir, { languages, defaultLanguage, i18n, site: options.site }),
      });
      if (options.site) {
        const { site } = options;
        api.onAfterBuild({ order: 'post', handler: () => writeSitemap(webDir, site) });
      }
      api.modifyRsbuildConfig((userConfig, { mergeRsbuildConfig }) =>
        mergeRsbuildConfig(userConfig, {
          source: {
            define: {
              __GEM_BOOK_PROJECT_DIR__: JSON.stringify(rootPath),
              __GEM_BOOK_DOCS_DIR__: JSON.stringify(docs),
              // 对象需要括号，否则 `{...}.title` 不能解析
              __GEM_BOOK_CONFIG__: `(${JSON.stringify(config)})`,
              __GEM_BOOK_NAV__: JSON.stringify(nav),
              __GEM_BOOK_FOOTER__: JSON.stringify(footer),
              __GEM_BOOK_GLOBAL__: `(${JSON.stringify(global)})`,
              __GEM_BOOK_IMPORT_MAP__: `(${JSON.stringify(importMap)})`,
              __GEM_BOOK_IGNORED__: JSON.stringify(options.ignored || []),
            },
          },
          html: { favicon: iconFile || icon },
          resolve: {
            // 生成的模块在项目目录中，项目可能没有安装这些依赖
            alias: {
              '@mantou/gem': resolveDir('@mantou/gem'),
              // 插件的 API，项目可能没有安装 gem-book（例如使用 `npx`）
              'gem-book/plugin$': path.join(appDir, 'plugin.ts'),
              'gem-book/plugin/server$': path.join(appDir, 'plugin.server.ts'),
              '@mantou/gemkit$': fileURLToPath(import.meta.resolve('@mantou/gemkit')),
              '@mantou/gemkit/client$': fileURLToPath(import.meta.resolve('@mantou/gemkit/client')),
              '@mantou/gemkit/internal$': fileURLToPath(import.meta.resolve('@mantou/gemkit/internal')),
              '@mantou/gemkit/server$': fileURLToPath(import.meta.resolve('@mantou/gemkit/server')),
            },
          },
          // 文档中引用的图片等资源，文档已经渲染到页面中，不需要输出
          server: {
            publicDir: { name: docs, ignore: ['**/*.md', '**/config.yml'] },
          },
          environments: {
            web: { output: { externals: [externals] } },
            node: {
              output: {
                externals: [
                  // `<gbp-api>` 使用，不能打包，项目中可能没有安装
                  Object.fromEntries(
                    ['tsrs/unstable/sync', 'tsrs/unstable/ast'].map((id) => [
                      id,
                      `commonjs ${fileURLToPath(import.meta.resolve(id))}`,
                    ]),
                  ),
                  // 服务端不会加载
                  externals,
                ],
              },
            },
          },
          dev: {
            // 文档不是模块，修改后刷新页面重新渲染
            watchFiles: { paths: docs, type: 'reload-page' },
            // 页面中多个示例同时激活懒编译会连续重新编译，已请求的 chunk 和新编译的不一致，模块加载失败
            lazyCompilation: false,
          },
        }),
      );
    },
  };

  return [
    // 在 gemkit 生成路由之前生成源码目录
    plugin,
    pluginGemkit({
      srcDir: SRC_DIR,
      title,
      titleTemplate: `%s - ${title}`,
      defaultLanguage: fallbackLanguage,
      prefixDefaultLanguage: i18n,
      gem: {
        // 例如模版中的 `<gbp-docsearch>`
        autoImport: { elements: { 'gem-book': { 'gbp-*': '/elements/*' } } },
        include: [
          /[\\/]\.gem-book[\\/]/,
          /[\\/]\.gemkit[\\/]/,
          appDir,
          resolveDir('@mantou/gemkit'),
          // 本地的 `<gbp-import>` 模块和全站插件
          ...localFiles,
          ...replacedDirs,
          ...plugins.filter((plugin) => path.isAbsolute(plugin)),
        ],
      },
    }),
  ];
}
