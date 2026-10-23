import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test, { after, snapshot } from 'node:test';

import { generate, scanPages } from '../plugin/codegen';

snapshot.setDefaultSnapshotSerializers([(v) => v]);

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gemkit-'));
after(() => fs.rmSync(tmpDir, { recursive: true }));

/** 在临时目录中创建文件，返回根目录 */
function createFixture(files: string[]) {
  const root = fs.mkdtempSync(path.join(tmpDir, 'app-'));
  for (const file of files) {
    const fullPath = path.join(root, file);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, file.endsWith('.json') ? '{}' : '');
  }
  return root;
}

const pageFiles = [
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
  'src/pages/blog/[slug].server.ts',
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
  const [{ pattern, layout: blog }] = layout.layouts;
  assert.equal(pattern, '/blog/*');
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
    'client.ts',
    'env.d.ts',
    'i18n.ts',
    'routes.ts',
    'server.ts',
    'tsconfig.json',
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
    },
    files: ['./env.d.ts', './auto-import.d.ts'],
  });
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
  assert.match(read('routes.ts'), /import\("..\/theme\/pages\/index"\)/);
  assert.match(read('i18n.ts'), /"en": \(\) => import\("..\/theme\/locales\/en.json"\),/);
  assert.match(read('client.ts'), /import "..\/theme\/app";/);
  assert.throws(
    () => generate(root, { srcDir: 'theme', defaultLanguage: 'fr' }),
    /not found `theme\/locales\/fr.json`/,
  );
});
