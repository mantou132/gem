import { once } from 'node:events';
import fs from 'node:fs';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import zlib from 'node:zlib';

import { serve } from '@hono/node-server';

import { type App, createApp, nodePlatform, precompress } from '../node';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gemkit-'));
const webDir = path.join(root, 'dist/web');

const script = `console.log(${JSON.stringify('x'.repeat(2000))});`;
const page = `<p>${'page '.repeat(400)}</p>`;

const write = (file: string, content: string) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
};

write(path.join(webDir, 'static/js/index.1234.js'), script);
write(path.join(webDir, 'about/index.html'), page);
write(path.join(webDir, 'small.txt'), 'small');
write(path.join(root, 'dist/server/template.html'), '<!--gemkit-body-->');

// 服务端渲染：`/stream` 先输出一部分，`release()` 后再结束
write(
  path.join(root, 'dist/server/index.js'),
  `exports.default = {
    matchEndpoint: () => undefined,
    getRevalidate: async () => undefined,
    setRevalidateHandler: () => {},
    renderDocument: async (_, request) => {
      const headers = { 'content-type': 'text/html; charset=utf-8' };
      if (new URL(request.url).pathname !== '/stream') return new Response(${JSON.stringify(page)}, { headers });
      const encoder = new TextEncoder();
      const body = new ReadableStream({
        async start(controller) {
          controller.enqueue(encoder.encode('<head>'));
          await new Promise((resolve) => (globalThis.release = resolve));
          controller.enqueue(encoder.encode('<body>'));
          controller.close();
        },
      });
      return new Response(body, { headers });
    },
  };`,
);
write(path.join(root, 'dist/server/package.json'), '{ "type": "commonjs" }');

let app: App;
// 和构建一样，启动服务器之前压缩
test.before(async () => {
  await precompress(webDir);
  app = await createApp({ root });
});

const get = (url: string, headers?: Record<string, string>) =>
  app.fetch(new Request(`http://localhost${url}`, { headers }));

const decode = async (res: Response) => {
  const data = Buffer.from(await res.arrayBuffer());
  const encoding = res.headers.get('content-encoding');
  if (encoding === 'br') return zlib.brotliDecompressSync(data).toString();
  if (encoding === 'gzip') return zlib.gunzipSync(data).toString();
  return data.toString();
};

test('静态文件：带 hash 的文件长期缓存，其他文件使用 ETag 验证', async ({ assert }) => {
  const js = await get('/static/js/index.1234.js');
  assert.equal(js.headers.get('cache-control'), 'public, max-age=31536000, immutable');
  assert.equal(js.headers.get('content-type'), 'text/javascript; charset=utf-8');
  assert.equal(await js.text(), script);
  const about = await get('/about');
  assert.equal(about.headers.get('cache-control'), 'no-cache');
  assert.equal(await about.text(), page, '目录使用 `index.html`');
  const etag = about.headers.get('etag')!;
  const cached = await get('/about', { 'if-none-match': etag });
  assert.equal(cached.status, 304);
  assert.equal(cached.body, null);
});

test('静态文件：分段请求', async ({ assert }) => {
  const res = await get('/small.txt', { range: 'bytes=1-3' });
  assert.equal(res.status, 206);
  assert.equal(res.headers.get('content-range'), 'bytes 1-3/5');
  assert.equal(await res.text(), 'mal');
  assert.equal(await (await get('/small.txt', { range: 'bytes=-2' })).text(), 'll');
  assert.equal((await get('/small.txt', { range: 'bytes=9-' })).status, 416);
});

test('precompress: 使用构建时压缩的文件，太小的文件不压缩', async ({ assert }) => {
  assert.equal(fs.existsSync(path.join(webDir, 'about/index.html.br')), true);
  assert.equal(fs.existsSync(path.join(webDir, 'small.txt.br')), false);
  const br = await get('/static/js/index.1234.js', { 'accept-encoding': 'gzip, deflate, br' });
  assert.equal(br.headers.get('content-encoding'), 'br');
  assert.equal(br.headers.get('vary'), 'Accept-Encoding');
  assert.equal(await decode(br), script);
  const gzip = await get('/about', { 'accept-encoding': 'gzip, br;q=0' });
  assert.equal(gzip.headers.get('content-encoding'), 'gzip');
  assert.equal(await decode(gzip), page);
  assert.equal((await get('/about')).headers.get('content-encoding'), null);
});

test('动态响应：压缩服务端渲染的页面，带查询参数的请求不使用预渲染的文件', async ({ assert }) => {
  const res = await get('/about?a=1', { 'accept-encoding': 'br' });
  assert.equal(res.headers.get('content-encoding'), 'br');
  assert.equal(await decode(res), page);
  const plain = await get('/about?a=1');
  assert.equal(plain.headers.get('content-encoding'), null);
});

test('compress: 关闭时不压缩动态响应，仍然使用构建时压缩的文件', async ({ assert }) => {
  const uncompressed = await createApp({ root, compress: false });
  const request = (url: string) =>
    uncompressed.fetch(new Request(`http://localhost${url}`, { headers: { 'accept-encoding': 'br' } }));
  const dynamic = await request('/about?a=1');
  assert.equal(dynamic.headers.get('content-encoding'), null);
  assert.equal(await dynamic.text(), page);
  assert.equal((await request('/about')).headers.get('content-encoding'), 'br');
});

test('动态响应：压缩时仍然流式输出', async ({ assert }) => {
  const res = await get('/stream', { 'accept-encoding': 'gzip' });
  const reader = res.body!.getReader();
  // 后面的内容输出之前就能读到前面的内容
  const first = (await reader.read()).value!;
  assert.equal(zlib.gunzipSync(first, { finishFlush: zlib.constants.Z_SYNC_FLUSH }).toString(), '<head>');
  (globalThis as unknown as { release: () => void }).release();
  const chunks: Uint8Array[] = [first];
  for (let result = await reader.read(); !result.done; result = await reader.read()) chunks.push(result.value);
  assert.equal(zlib.gunzipSync(Buffer.concat(chunks)).toString(), '<head><body>');
});

test('静态文件：HTTP 服务器的响应头合法', async ({ assert }) => {
  // 和 `gemkit start` 一样替换全局的 `Response`，内容是 buffer 时由它设置 `Content-Length`
  const server = serve({ fetch: app.fetch, port: 0 });
  await once(server, 'listening');
  const { port } = server.address() as AddressInfo;
  // Node.js 的客户端拒绝重复的 `Content-Length`
  const get = (headers?: http.OutgoingHttpHeaders) =>
    new Promise<http.IncomingMessage>((resolve, reject) => {
      http.get({ port, path: '/about', headers, agent: false }, resolve).on('error', reject);
    });
  try {
    for (const res of [await get(), await get({ 'accept-encoding': 'br' })]) {
      assert.equal(res.statusCode, 200);
      res.resume();
    }
  } finally {
    server.close();
  }
});

test('drain: 等待 `waitUntil` 的后台任务完成', async ({ assert }) => {
  let done = false;
  nodePlatform.ctx.waitUntil(new Promise((resolve) => setTimeout(resolve, 10)).then(() => (done = true)));
  await app.drain();
  assert.equal(done, true);
});

test.after(() => {
  fs.rmSync(root, { recursive: true });
});
