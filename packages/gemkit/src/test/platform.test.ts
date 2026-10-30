// 必须在 Gem 之前执行，用来模拟 DOM 环境
import '@mantou/gem-ssr';

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { customElement, GemElement, html, template } from '@mantou/gem';
import { server } from '@mantou/gem-ssr/decorators';

import { cloudflare } from '../adapters/cloudflare';
import { createHandler as createCloudflareHandler } from '../adapters/cloudflare/runtime';
import { ELEMENT_PATH } from '../constants';
import { getRequestEvent, type ServerModule } from '../data';
import { prerenderPage } from '../handler';
import { pageRoute, setOutlets } from '../outlet';
import { page } from '../page';
import { createRenderer } from '../server';

declare module '../data' {
  interface PlatformEnv {
    GREETING?: string;
  }
}

@customElement('app-server-greeting')
@server()
class ServerGreetingElement extends GemElement {
  @template()
  #content = () => html`${getRequestEvent().platform?.env.GREETING}`;
}

@page('Home')
class HomePage extends GemElement {
  data: string;

  @template()
  #content = () => html`<p>${this.data}</p>`;
}

const home = { tag: 'gemkit-page-index', load: async () => ({ default: HomePage }), server: true };

const serverModules: Record<string, () => Promise<ServerModule>> = {
  [home.tag]: async () => ({
    revalidate: 60,
    load: ({ platform }) => platform?.env.GREETING ?? 'prerendered',
    actions: { greet: ({ platform }) => platform!.env.GREETING },
  }),
};

setOutlets({ '': [pageRoute('/', home, (_, data) => html`<gemkit-page-index .data=${data}></gemkit-page-index>`)] });

// `handle` 在后台任务中记录日志
const logs: string[] = [];

const renderer = createRenderer({
  app: html`<gemkit-outlet></gemkit-outlet>`,
  serverModules,
  endpoints: [{ pattern: '/api/greeting', load: async () => ({ GET: ({ platform }) => platform!.env.GREETING }) }],
  appServerModule: {
    handle: ({ path, platform }, resolve) => {
      platform?.ctx.waitUntil(Promise.resolve().then(() => logs.push(path)));
      return resolve();
    },
  },
});

const documentTemplate = '<!doctype html><html><head><title></title></head><body><!--gemkit-body--></body></html>';

test('platform：Cloudflare 的 `env` 和 `ctx` 传给 `handle`、`load`、actions、API 路由和纯服务端元素', async ({
  assert,
}) => {
  const tasks: Promise<unknown>[] = [];
  const env = { GREETING: 'hi' };
  const ctx = { waitUntil: (promise: Promise<unknown>) => tasks.push(promise) };
  const { fetch } = createCloudflareHandler(renderer, documentTemplate);
  const send = (url: string, init?: RequestInit) => fetch(new Request(`http://localhost${url}`, init), env, ctx);

  assert.match(await (await send('/')).text(), /-->hi<\/p>/);
  assert.deepEqual(await (await send('/__data.json')).json(), { data: { [home.tag]: 'hi' } });
  const action = await send('/?/greet', { method: 'POST', headers: { accept: 'application/json' } });
  assert.deepEqual(await action.json(), { type: 'success', data: 'hi' });
  assert.equal(await (await send('/api/greeting')).json(), 'hi');
  const elements = await send(ELEMENT_PATH, {
    method: 'POST',
    body: JSON.stringify({ url: '/', elements: [{ tag: 'app-server-greeting', attrs: {}, props: {} }] }),
  });
  assert.match((await elements.json())[0], /hi/);
  await Promise.all(tasks);
  assert.deepEqual(logs, ['/', '/', '/', '/api/greeting', '/']);
});

test('platform：构建时预渲染没有平台上下文，ISR 在请求中预渲染时有', async ({ assert }) => {
  const prerendered = (await prerenderPage(renderer, documentTemplate, '/'))!;
  assert.match(prerendered.files.get('/index.html')!, /-->prerendered<\/p>/);
  const env = { GREETING: 'isr' };
  const ctx = { waitUntil: () => {} };
  const isr = (await prerenderPage(renderer, documentTemplate, '/', { env, ctx }))!;
  assert.match(isr.files.get('/index.html')!, /-->isr<\/p>/);
  assert.equal(isr.files.get('/__data.json'), JSON.stringify({ data: { [home.tag]: 'isr' } }));
});

test('cloudflare：合并 `src/worker.ts` 的导出', async ({ assert }) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gemkit-cloudflare-'));
  const srcDir = path.join(root, 'src');
  const distDir = path.join(root, 'dist');
  const write = (dir: string) =>
    cloudflare().write({
      rootPath: root,
      srcDir: dir,
      distDir,
      webDir: path.join(distDir, 'web'),
      serverDir: path.join(distDir, 'server'),
      cacheDir: path.join(distDir, 'cache'),
      handlerFile: path.join(distDir, 'server/handler.js'),
      template: '<html></html>',
    });
  const read = () => fs.readFileSync(path.join(distDir, 'cloudflare/index.js'), 'utf8');
  try {
    fs.mkdirSync(srcDir);
    await write(srcDir);
    assert.equal(
      read(),
      'import { createHandler } from "../server/handler.js";\n\nexport default createHandler("<html></html>");\n',
    );
    fs.writeFileSync(path.join(srcDir, 'worker.ts'), '');
    await write(srcDir);
    assert.equal(
      read(),
      [
        'import { createHandler } from "../server/handler.js";',
        'import * as worker from "../../src/worker.ts";',
        '',
        'export * from "../../src/worker.ts";',
        '',
        'export default { ...worker.default, fetch: createHandler("<html></html>").fetch };',
        '',
      ].join('\n'),
    );
  } finally {
    fs.rmSync(root, { recursive: true });
  }
});
