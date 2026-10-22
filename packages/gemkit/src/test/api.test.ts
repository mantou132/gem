// 必须在 Gem 之前执行，用来模拟 DOM 环境
import '@mantou/gem-ssr';

import test from 'node:test';

import { createApi } from '../api';
import { HttpError } from '../data';

test('createApi: 属性是路径，调用是参数，请求方法发送请求', async ({ assert, mock }) => {
  const calls: [string, RequestInit][] = [];
  mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => {
    calls.push([url, init]);
    if (url.startsWith('/api/locked')) return Response.json({ status: 403, message: 'Locked' }, { status: 403 });
    if (url === '/rss.xml') return new Response('<rss></rss>', { headers: { 'content-type': 'application/xml' } });
    return Response.json({ ok: true });
  });
  const apis = createApi();

  assert.deepEqual(await apis.api.likes('a b').POST({ count: 1 }), { ok: true });
  assert.deepEqual(calls.at(-1), [
    '/api/likes/a%20b',
    { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"count":1}' },
  ]);
  await apis.api.likes.GET({ page: '2' });
  assert.deepEqual(calls.at(-1), ['/api/likes?page=2', { method: 'GET' }]);
  // 剩余参数
  await apis.files('a', 'b/c').DELETE();
  assert.deepEqual(calls.at(-1), ['/files/a/b%2Fc', { method: 'DELETE' }]);
  // 不是 JSON 时得到原始响应
  assert.equal(await (await apis['rss.xml'].GET()).text(), '<rss></rss>');
  // 错误
  await assert.rejects(apis.api.locked.POST(), (err) => err instanceof HttpError && err.status === 403);
  // 不是 thenable
  assert.equal(typeof (await apis.api), 'function');
});
