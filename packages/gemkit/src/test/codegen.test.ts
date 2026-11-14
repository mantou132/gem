import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test, { after, snapshot } from 'node:test';

import { generate, scanPages } from '../plugin/codegen';

snapshot.setDefaultSnapshotSerializers([(v) => v]);

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gemkit-'));
after(() => fs.rmSync(tmpDir, { recursive: true }));

/** 在临时目录中创建文件，可以指定内容，返回根目录 */
function createFixture(files: (string | [file: string, content: string])[]) {
  const root = fs.mkdtempSync(path.join(tmpDir, 'app-'));
  for (const item of files) {
    const [file, content] = typeof item === 'string' ? [item, item.endsWith('.json') ? '{}' : ''] : item;
    const fullPath = path.join(root, file);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
  }
  return root;
}

const pageFiles: (string | [string, string])[] = [
  'src/pages/_layout.ts',
  'src/pages/_error.ts',
  'src/pages/_utils.ts',
  'src/pages/index.ts',
  'src/pages/about.ts',
  'src/pages/[id].ts',
  'src/pages/[id].test.ts',
  'src/pages/types.d.ts',
  'src/pages/blog/_layout.ts',
  'src/pages/blog/index.ts',
  'src/pages/blog/[slug].ts',
  ['src/pages/blog/[slug].server.ts', 'export const load = () => ({});'],
  'src/pages/blog/new.ts',
  'src/pages/files/[...path].ts',
  'src/pages/files/[name].ts',
  'src/pages/files/new.ts',
  'src/pages/rss.xml.server.ts',
  'src/pages/api/index.server.ts',
  'src/pages/api/likes/[slug].server.ts',
  'src/pages/api/likes/top.server.ts',
];

test('scanPages: 页面、layout 和标签名', ({ assert }) => {
  const root = createFixture(pageFiles);
  const pagesDir = path.join(root, 'src/pages');
  const { root: layout, error } = scanPages(pagesDir);
  const rel = (file?: string) => file && path.relative(pagesDir, file);

  assert.equal(layout.tag, 'gemkit-layout-root');
  assert.equal(rel(layout.file), '_layout.ts');
  // `_` 开头、`.d.ts` 和测试文件不是页面，没有 layout 的目录中的页面属于上级 layout
  assert.deepEqual(
    layout.pages.map(({ pattern, tag }) => [pattern, tag]),
    [
      ['/:id', 'gemkit-page-id'],
      ['/about', 'gemkit-page-about'],
      ['/files/*', 'gemkit-page-files-path'],
      ['/files/:name', 'gemkit-page-files-name'],
      ['/files/new', 'gemkit-page-files-new'],
      ['/', 'gemkit-page-index'],
    ],
  );

  assert.equal(layout.layouts.length, 1);
  const [{ patterns, layout: blog }] = layout.layouts;
  assert.deepEqual(patterns, ['/blog/*']);
  assert.equal(blog.tag, 'gemkit-layout-blog');
  assert.equal(rel(blog.file), 'blog/_layout.ts');
  assert.deepEqual(
    blog.pages.map(({ pattern, tag, server }) => [pattern, tag, rel(server)]),
    [
      ['/blog/:slug', 'gemkit-page-blog-slug', 'blog/[slug].server.ts'],
      ['/blog', 'gemkit-page-blog-index', undefined],
      ['/blog/new', 'gemkit-page-blog-new', undefined],
    ],
  );

  assert.deepEqual(error && { ...error, file: rel(error.file) }, { file: '_error.ts', tag: 'gemkit-page-error' });
});

test('scanPages: 没有同名页面模块的 `*.server.ts` 是 API 路由', ({ assert }) => {
  const root = createFixture(pageFiles);
  const pagesDir = path.join(root, 'src/pages');
  const { endpoints } = scanPages(pagesDir);
  assert.deepEqual(
    endpoints.map(({ pattern, file }) => [pattern, path.relative(pagesDir, file)]),
    [
      ['/api/likes/top', 'api/likes/top.server.ts'],
      ['/api/likes/:slug', 'api/likes/[slug].server.ts'],
      ['/api', 'api/index.server.ts'],
      ['/rss.xml', 'rss.xml.server.ts'],
    ],
  );
});

test('scanPages: 没有 layout 和错误页面', ({ assert }) => {
  const root = createFixture(['src/pages/index.ts']);
  const { root: layout, error } = scanPages(path.join(root, 'src/pages'));
  assert.equal(layout.tag, '');
  assert.equal(layout.file, undefined);
  assert.equal(error, undefined);
});

test('scanPages: 标签名重复时报错', ({ assert }) => {
  const root = createFixture(['src/pages/a-b.ts', 'src/pages/a_b.ts']);
  assert.throws(() => scanPages(path.join(root, 'src/pages')), /have the same tag `gemkit-page-a-b`/);
});

test('scanPages: API 路由和页面的路径相同时报错', ({ assert }) => {
  const root = createFixture(['src/pages/post/[id].ts', 'src/pages/post/[slug].server.ts']);
  assert.throws(() => scanPages(path.join(root, 'src/pages')), /have the same path `\/post\/:slug`/);
  const index = createFixture(['src/pages/blog.ts', 'src/pages/blog/index.server.ts']);
  assert.throws(() => scanPages(path.join(index, 'src/pages')), /have the same path `\/blog`/);
});

test('scanPages: 路由分组不是路径的一部分，分组的 layout 匹配其中的页面和子 layout', ({ assert }) => {
  const root = createFixture([
    'src/pages/index.ts',
    'src/pages/(marketing)/_layout.ts',
    'src/pages/(marketing)/about.ts',
    'src/pages/(marketing)/(legal)/terms.ts',
    'src/pages/(marketing)/blog/_layout.ts',
    'src/pages/(marketing)/blog/index.ts',
    'src/pages/(app)/_layout.ts',
    ['src/pages/(app)/_layout.server.ts', 'export const ssr = false;'],
    'src/pages/(app)/settings.ts',
    'src/pages/(app)/api.server.ts',
  ]);
  const { root: layout, endpoints } = scanPages(path.join(root, 'src/pages'));
  assert.deepEqual(
    layout.pages.map(({ pattern }) => pattern),
    ['/'],
  );
  assert.deepEqual(
    layout.layouts.map(({ patterns, layout: { tag, ssr } }) => [tag, ssr, patterns]),
    [
      ['gemkit-layout-app', false, ['/settings']],
      ['gemkit-layout-marketing', true, ['/terms', '/about', '/blog/*']],
    ],
  );
  assert.deepEqual(
    layout.layouts[1].layout.pages.map(({ pattern, tag }) => [pattern, tag]),
    [
      ['/terms', 'gemkit-page-marketing-legal-terms'],
      ['/about', 'gemkit-page-marketing-about'],
    ],
  );
  assert.deepEqual(
    endpoints.map(({ pattern }) => pattern),
    ['/api'],
  );
});

test('scanPages: 不同路由分组中的页面路径相同时报错', ({ assert }) => {
  const root = createFixture(['src/pages/(a)/about.ts', 'src/pages/(b)/about.ts']);
  assert.throws(() => scanPages(path.join(root, 'src/pages')), /have the same path `\/about`/);
});

test('generate: 路由分组的 layout 的多个路由使用同一个模板', ({ assert }) => {
  const root = createFixture(['src/pages/(site)/_layout.ts', 'src/pages/(site)/a.ts', 'src/pages/(site)/b.ts']);
  generate(root, {});
  const routes = fs.readFileSync(path.join(root, '.gemkit/routes.ts'), 'utf8');
  assert.equal(routes.match(/<gemkit-layout-site /g)?.length, 1);
  assert.match(routes, /layout0\("\/a"\),\n\s+layout0\("\/b"\),/);
});

test('generate: 生成路由和入口文件', ({ assert }) => {
  const root = createFixture([
    ...pageFiles,
    'src/app.ts',
    'src/app.server.ts',
    'src/locales/en.json',
    'src/locales/zh-CN.json',
  ]);
  generate(root, { title: 'Site', titleTemplate: '%s | Site' });
  const genDir = path.join(root, '.gemkit');
  const read = (file: string) => fs.readFileSync(path.join(genDir, file), 'utf8');

  assert.deepEqual(fs.readdirSync(genDir).sort(), [
    '.gitignore',
    'api.ts',
    'client-build.json',
    'client.ts',
    'env.d.ts',
    'i18n.ts',
    'routes.ts',
    'server.ts',
    'tsconfig.json',
    'types',
  ]);
  // 生成目录忽略自身
  assert.equal(read('.gitignore'), '*\n');
  assert.snapshot(read('routes.ts'));

  const i18n = read('i18n.ts');
  assert.match(i18n, /export const languages = \["en","zh-CN"\];/);
  assert.match(i18n, /export const defaultLanguage = 'en';/);
  assert.match(i18n, /"zh-CN": \(\) => import\("..\/src\/locales\/zh-CN.json"\),/);

  const client = read('client.ts');
  assert.match(client, /import "..\/src\/app";/);
  assert.match(client, /startClient\(\{"title":"Site","titleTemplate":"%s \| Site"\}\);/);

  const server = read('server.ts');
  // 服务端使用 `routes.ts` 中的页面路由匹配，API 路由只在服务端入口中
  assert.doesNotMatch(server, /pattern: '\/blog/);
  assert.match(
    server,
    /\{ pattern: '\/api\/likes\/:slug', load: \(\) => import\("..\/src\/pages\/api\/likes\/\[slug\].server"\) \},/,
  );
  assert.doesNotMatch(read('routes.ts'), /api/);
  assert.match(server, /'gemkit-page-blog-slug': \(\) => import\("..\/src\/pages\/blog\/\[slug\].server"\),/);
  assert.match(server, /import \* as appServerModule from "..\/src\/app.server";/);
  assert.match(server, /^ {2}appServerModule,$/m);
  // 客户端路由不能引用 `*.server.ts`
  assert.doesNotMatch(read('routes.ts'), /\.server/);

  // 只引用服务端模块的类型，构建时会移除
  assert.snapshot(read('api.ts'));

  assert.deepEqual(JSON.parse(read('tsconfig.json')), {
    compilerOptions: {
      paths: { '$gemkit/i18n': ['./i18n.ts'], '$gemkit/api': ['./api.ts'], 'src/*': ['../src/*'] },
      rootDirs: ['../src', './types'],
    },
    files: ['./env.d.ts', './auto-import.d.ts'],
    include: ['../**/*'],
  });
});

test('generate: 每个页面、布局和 API 路由的参数类型，来自文件路径', ({ assert }) => {
  const root = createFixture([
    'src/pages/_layout.ts',
    'src/pages/index.ts',
    'src/pages/[lang]/_layout.ts',
    'src/pages/[lang]/_layout.server.ts',
    'src/pages/[lang]/(docs)/_layout.ts',
    'src/pages/[lang]/(docs)/[...path].ts',
    'src/pages/[lang]/blog/[slug].ts',
    'src/pages/[lang]/blog/[slug].server.ts',
    'src/pages/api/likes/[slug].server.ts',
  ]);
  generate(root, {});
  const typesDir = path.join(root, '.gemkit/types/pages');
  const params = (file: string) =>
    /export type Params = (.*);/.exec(fs.readFileSync(path.join(typesDir, file), 'utf8'))?.[1];

  assert.equal(params('_layout.$types.d.ts'), '{}');
  assert.equal(params('index.$types.d.ts'), '{}');
  // 布局不包括子路由的参数，路由分组不是路径的一部分
  assert.equal(params('[lang]/_layout.$types.d.ts'), '{ "lang": string }');
  assert.equal(params('[lang]/(docs)/_layout.$types.d.ts'), '{ "lang": string }');
  assert.equal(params('[lang]/(docs)/[...path].$types.d.ts'), '{ "lang": string; "path": string }');
  // 页面模块和服务端模块使用同一个类型文件
  assert.equal(params('[lang]/blog/[slug].$types.d.ts'), '{ "lang": string; "slug": string }');
  assert.equal(params('api/likes/[slug].$types.d.ts'), '{ "slug": string }');
  const read = (file: string) => fs.readFileSync(path.join(typesDir, file), 'utf8');
  // API 路由只有处理函数的类型
  const endpoint = read('api/likes/[slug].$types.d.ts');
  assert.match(endpoint, /export type ServerContext = ServerLoadContext<Params>;/);
  assert.match(endpoint, /export type Handler = RequestHandler<Params>;/);
  assert.doesNotMatch(endpoint, /Actions|ServerData|Paths/);
  // 有服务端模块时 `ServerData` 是它的 `load` 的结果，路径相对于源码
  const post = read('[lang]/blog/[slug].$types.d.ts');
  assert.match(post, /export type ServerData = typeof import\("\.\/\[slug\]\.server"\) extends/);
  assert.match(post, /export type Actions = /);
  assert.match(post, /export type Paths = /);
  assert.match(read('index.$types.d.ts'), /export type ServerData = undefined;/);
  // 表单可以提交到上层布局和自己的 actions，从外到内，路径相对于源码
  assert.match(
    post,
    /export type FormActions = MergeActions<\[typeof import\("\.\.\/_layout\.server"\), typeof import\("\.\/\[slug\]\.server"\)\]>;/,
  );
  assert.match(
    read('[lang]/(docs)/[...path].$types.d.ts'),
    /export type FormActions = MergeActions<\[typeof import\("\.\.\/_layout\.server"\)\]>;/,
  );
  assert.match(read('index.$types.d.ts'), /export type FormActions = MergeActions<\[\]>;/);
  // `paths` 只对页面有效
  assert.doesNotMatch(read('[lang]/_layout.$types.d.ts'), /Paths/);

  // 删除或者改名的路由不再有类型文件
  fs.renameSync(
    path.join(root, 'src/pages/api/likes/[slug].server.ts'),
    path.join(root, 'src/pages/api/likes/[id].server.ts'),
  );
  fs.rmSync(path.join(root, 'src/pages/[lang]/blog'), { recursive: true });
  generate(root, {});
  assert.equal(params('api/likes/[id].$types.d.ts'), '{ "id": string }');
  assert.equal(fs.existsSync(path.join(typesDir, 'api/likes/[slug].$types.d.ts')), false);
  assert.equal(fs.existsSync(path.join(typesDir, '[lang]/blog')), false, '空目录也删除');
});

test('generate: 路径中有保留名称的 API 路由不在 `$gemkit/api` 中，返回警告', ({ assert }) => {
  const root = createFixture([
    'src/pages/api/then/[id].server.ts',
    'src/pages/api/items/GET.server.ts',
    'src/pages/api/user-info.server.ts',
    // 参数名不是路径的静态部分
    'src/pages/api/likes/[then].server.ts',
  ]);
  const { warnings } = generate(root, {});
  assert.deepEqual(warnings, [
    'gemkit: `src/pages/api/items/GET.server.ts` is not in `$gemkit/api`, `GET` in its path is reserved, rename it or use `fetch`',
    'gemkit: `src/pages/api/then/[id].server.ts` is not in `$gemkit/api`, `then` in its path is reserved, rename it or use `fetch`',
  ]);
  const api = fs.readFileSync(path.join(root, '.gemkit/api.ts'), 'utf8');
  assert.doesNotMatch(api, /"then"|"GET"|items/);
  assert.match(api, /"user-info": EndpointMethods/);
  assert.match(api, /\(then: string\): EndpointMethods/);
  // 服务端仍然处理这些路由
  assert.match(fs.readFileSync(path.join(root, '.gemkit/server.ts'), 'utf8'), /pattern: '\/api\/then\/:id'/);
});

test('generate: 根目录剩余参数页面排在首页之后', ({ assert }) => {
  const root = createFixture(['src/pages/index.ts', 'src/pages/[...rest].ts', 'src/pages/files/[...path].ts']);
  generate(root, {});
  const routes = fs.readFileSync(path.join(root, '.gemkit/routes.ts'), 'utf8');
  // `*` 能匹配空片段，所以 `/` 要排在 `/*` 之前
  assert.deepEqual(
    [...routes.matchAll(/pageRoute\("([^"]+)"/g)].map(([, pattern]) => pattern),
    ['/files/*', '/', '/*'],
  );
});

test('generate: 没有语言文件', ({ assert }) => {
  const root = createFixture(['src/pages/index.ts']);
  generate(root, {});
  const i18n = fs.readFileSync(path.join(root, '.gemkit/i18n.ts'), 'utf8');
  assert.match(i18n, /export const i18n = undefined;/);
  assert.match(i18n, /export const languages: string\[\] = \[\];/);
});

test('generate: 指定的默认语言不存在时报错', ({ assert }) => {
  const root = createFixture(['src/pages/index.ts', 'src/locales/en.json']);
  assert.throws(() => generate(root, { defaultLanguage: 'fr' }), /not found `src\/locales\/fr.json`/);
});

test('generate: 默认语言也使用路径前缀', ({ assert }) => {
  const root = createFixture(['src/pages/index.ts', 'src/locales/en.json', 'src/locales/zh.json']);
  generate(root, { prefixDefaultLanguage: true });
  const i18n = fs.readFileSync(path.join(root, '.gemkit/i18n.ts'), 'utf8');
  assert.match(i18n, /export const prefixDefaultLanguage = true;/);
  const server = fs.readFileSync(path.join(root, '.gemkit/server.ts'), 'utf8');
  assert.match(server, /^ {2}prefixDefaultLanguage,$/m);
});

test('generate: 使用其他目录中的页面和语言文件', ({ assert }) => {
  const root = createFixture(['theme/pages/index.ts', 'theme/locales/en.json', 'theme/app.ts']);
  generate(root, { srcDir: 'theme' });
  const read = (file: string) => fs.readFileSync(path.join(root, '.gemkit', file), 'utf8');
  assert.match(
    read('routes.ts'),
    /import\(\/\* webpackChunkName: "gemkit-page-index" \*\/ "..\/theme\/pages\/index"\)/,
  );
  assert.match(read('i18n.ts'), /"en": \(\) => import\("..\/theme\/locales\/en.json"\),/);
  assert.match(read('client.ts'), /import "..\/theme\/app";/);
  assert.throws(
    () => generate(root, { srcDir: 'theme', defaultLanguage: 'fr' }),
    /not found `theme\/locales\/fr.json`/,
  );
});

test('scanPages: `ssr = false` 对 layout 中的页面都有效，分析是否导出了 `load`', ({ assert }) => {
  const root = createFixture([
    'src/pages/_layout.ts',
    'src/pages/index.ts',
    ['src/pages/index.server.ts', 'export async function load() {}'],
    'src/pages/play.ts',
    ['src/pages/play.server.ts', "export const ssr = false;\nexport { load } from './data';"],
    'src/pages/app/_layout.ts',
    ['src/pages/app/_layout.server.ts', 'export const ssr = false;\nexport const prerender = false;'],
    'src/pages/app/index.ts',
    ['src/pages/app/index.server.ts', "export * from './data';"],
    'src/pages/app/settings/_layout.ts',
    'src/pages/app/settings/index.ts',
  ]);
  const { root: layout } = scanPages(path.join(root, 'src/pages'));
  const pick = ({ tag, ssr, load }: { tag: string; ssr: boolean; load: boolean }) => [tag, ssr, load];
  assert.deepEqual(pick(layout), ['gemkit-layout-root', true, false]);
  assert.deepEqual(layout.pages.map(pick), [
    ['gemkit-page-index', true, true],
    ['gemkit-page-play', false, true],
  ]);
  const [{ layout: app }] = layout.layouts;
  assert.deepEqual(pick(app), ['gemkit-layout-app', false, false]);
  // `export *` 不能确定，认为导出了 `load`
  assert.deepEqual(app.pages.map(pick), [['gemkit-page-app-index', false, true]]);
  const [{ layout: settings }] = app.layouts;
  assert.deepEqual(
    [pick(settings), ...settings.pages.map(pick)],
    [
      ['gemkit-layout-app-settings', false, false],
      ['gemkit-page-app-settings-index', false, false],
    ],
  );
});

test('generate: 根 layout `ssr = false` 时是单页应用，`src/app.ts` 只在客户端执行', ({ assert }) => {
  const root = createFixture([
    'src/pages/_layout.ts',
    ['src/pages/_layout.server.ts', 'export const ssr = false;'],
    'src/pages/_error.ts',
    'src/pages/index.ts',
    'src/app.ts',
    'src/app.client.ts',
  ]);
  assert.deepEqual(generate(root, {}), { spa: true, clientRoutes: true, warnings: [] });
  const read = (file: string) => fs.readFileSync(path.join(root, '.gemkit', file), 'utf8');
  const routes = read('routes.ts');
  // 服务端构建时替换成空模块
  assert.match(routes, /import \* as RootLayout from "..\/src\/pages\/_layout\?gemkit-client";/);
  assert.match(
    routes,
    /load: \(\) => import\(\/\* webpackChunkName: "gemkit-page-error" \*\/ "..\/src\/pages\/_error\?gemkit-client"\)/,
  );
  assert.match(
    routes,
    /load: \(\) => import\(\/\* webpackChunkName: "gemkit-page-index" \*\/ "..\/src\/pages\/index\?gemkit-client"\), ssr: false \}/,
  );
  // 没有 `load`，客户端不请求数据
  assert.match(routes, /load: async \(\) => RootLayout, server: true, noLoad: true, ssr: false \}/);
  assert.match(
    read('client.ts'),
    /import "..\/src\/app";\nimport \* as appClient from "..\/src\/app.client";\nimport '.\/routes';/,
  );
  assert.match(read('client.ts'), /startClient\(.*, appClient\);/);
  assert.doesNotMatch(read('server.ts'), /src\/app/);

  const ssr = createFixture(['src/pages/_layout.ts', 'src/pages/index.ts', 'src/app.ts', 'src/app.client.ts']);
  assert.deepEqual(generate(ssr, {}), { spa: false, clientRoutes: false, warnings: [] });
  // 有 `ssr = false` 的页面时输出外壳页面作为后备页面
  const mixed = createFixture([
    'src/pages/index.ts',
    'src/pages/play.ts',
    ['src/pages/play.server.ts', 'export const ssr = false;'],
  ]);
  assert.deepEqual(generate(mixed, {}), { spa: false, clientRoutes: true, warnings: [] });
  assert.match(fs.readFileSync(path.join(ssr, '.gemkit/server.ts'), 'utf8'), /import "..\/src\/app";/);
  assert.doesNotMatch(fs.readFileSync(path.join(ssr, '.gemkit/server.ts'), 'utf8'), /app.client/);
});
