// 必须在 Gem 之前执行，用来模拟 DOM 环境
import '@mantou/gem-ssr';

import test from 'node:test';

import { history } from '@mantou/gem';

import { createApi, type EndpointMethods } from '../api';
import { CLIENT_HEADER, REDIRECT_HEADER } from '../constants';
import { HttpError } from '../data';
import { formActions } from '../navigation';

test('createApi: 属性是路径，调用是参数，请求方法发送请求', async ({ assert, mock }) => {
  const calls: [string, RequestInit][] = [];
  mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => {
    calls.push([url, init]);
    if (url.startsWith('/api/locked')) return Response.json({ status: 403, message: 'Locked' }, { status: 403 });
    if (url === '/api/login') return new Response(null, { headers: { [REDIRECT_HEADER]: '/me' } });
    if (url === '/rss.xml') return new Response('<rss></rss>', { headers: { 'content-type': 'application/xml' } });
    return Response.json({ ok: true });
  });
  const apis = createApi();

  assert.deepEqual(await apis.api.likes('a b').POST({ count: 1 }), { ok: true });
  assert.deepEqual(calls.at(-1), [
    '/api/likes/a%20b',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', [CLIENT_HEADER]: '1' },
      body: '{"count":1}',
    },
  ]);
  await apis.api.likes.GET({ page: '2' });
  assert.deepEqual(calls.at(-1), ['/api/likes?page=2', { method: 'GET', headers: { [CLIENT_HEADER]: '1' } }]);
  // 值为 `undefined` 的字段不发送
  await apis.api.likes.GET({ page: 2, tag: undefined });
  assert.equal(calls.at(-1)![0], '/api/likes?page=2');
  await apis.api.likes.GET({ tag: undefined });
  assert.equal(calls.at(-1)![0], '/api/likes');
  // 剩余参数
  await apis.files('a', 'b/c').DELETE();
  assert.deepEqual(calls.at(-1), ['/files/a/b%2Fc', { method: 'DELETE', headers: { [CLIENT_HEADER]: '1' } }]);
  // 不是 JSON 时得到原始响应
  assert.equal(await (await apis['rss.xml'].GET()).text(), '<rss></rss>');
  // 错误
  await assert.rejects(apis.api.locked.POST(), (err) => err instanceof HttpError && err.status === 403);
  // 跳转时客户端导航，不再 resolve
  const pushed = mock.method(history, 'push', () => {});
  let settled = false;
  apis.api.login.POST({}).finally(() => (settled = true));
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(settled, false);
  assert.deepEqual(pushed.mock.calls[0].arguments[0], { path: '/me', query: '', hash: '' });
  // 不是 thenable
  assert.equal(typeof (await apis.api), 'function');
});

test('formActions: action 名称和结果的类型来自 `actions`，返回表单的剩余属性', ({ assert }) => {
  const actions = {
    login: async () => ({ errors: ['invalid'] }),
    logout: () => {},
  };
  const { login, logout } = formActions<typeof actions>();
  const props = login((data) => {
    const errors: string[] | undefined = data?.errors;
    return errors;
  });
  assert.equal(props.method, 'post');
  assert.equal(props.action, '?/login');
  assert.equal(typeof props.onsubmit, 'function');
  assert.equal(logout().action, '?/logout');
  // @ts-expect-error 不存在的 action
  formActions<typeof actions>().register;
});

test('EndpointMethods: `GET` `DELETE` 的输入只能是查询参数能表示的值', () => {
  type Methods = EndpointMethods<{
    GET: (ctx: unknown, input: { page: number; tags: string[] }) => null;
    DELETE: (ctx: unknown, input?: { id: string; force?: boolean }) => null;
    POST: (ctx: unknown, input: { tags: string[] }) => null;
  }>;
  const call = <F extends (...args: any) => any>(_: F, ...args: Parameters<F>) => args;
  const methods = {} as Methods;
  // @ts-expect-error 数组不能作为查询参数
  call(methods.GET, { page: 1, tags: ['a'] });
  call(methods.DELETE, { id: 'a', force: true });
  call(methods.DELETE);
  // 请求体可以是任意 JSON
  call(methods.POST, { tags: ['a'] });
});
