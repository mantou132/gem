// 必须在 Gem 之前执行，用来模拟 DOM 环境
import '@mantou/gem-ssr';

import test from 'node:test';

import { history } from '@mantou/gem';

import { createApi, type EndpointMethods } from '../api';
import { CLIENT_HEADER, REDIRECT_HEADER } from '../constants';
import { fail, HttpError, RedirectError } from '../error';
import { formActions } from '../navigation';
import type { Params } from '../page';
import { endpoint } from '../request';
import type { Jsonify, MergeActions, StandardSchemaV1 } from '../types';

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
  // 跳转时客户端导航，页面渲染后以 `RedirectError` reject，`finally` 会执行
  const pushed = mock.method(history, 'push', () => {});
  let settled = false;
  await assert.rejects(
    apis.api.login.POST({}).finally(() => (settled = true)),
    (err) => err instanceof RedirectError && err.location === '/me',
  );
  assert.equal(settled, true);
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

test('formActions: `fail` 的结果类型是它的 `data`', () => {
  const actions = {
    sign: async (ok: boolean) => (ok ? { id: 1 } : fail(400, { error: 'required' as const })),
  };
  formActions<typeof actions>().sign((data) => {
    const result: { id: number } | { error: 'required' } | undefined = data;
    // @ts-expect-error 不是 `ActionFailure`
    data?.status;
    return result;
  });
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

test('EndpointMethods: `endpoint` 的参数是 schema 的输入类型，输入是 `unknown` 的字段使用输出类型', () => {
  // 只用到类型，和 zod 的 `input`、`output` 一致
  const schema = <I, O>() => ({}) as StandardSchemaV1<I, O>;
  type Methods = EndpointMethods<{
    // `z.object({ count: z.number().default(1) }).default({ count: 1 })`
    POST: ReturnType<
      typeof endpoint<StandardSchemaV1<{ count?: number } | undefined, { count: number }>, Params, null>
    >;
    // `z.object({ page: z.coerce.number() })`
    GET: ReturnType<typeof endpoint<StandardSchemaV1<{ page: unknown }, { page: number }>, Params, null>>;
    // `z.object({ at: z.string().transform((s) => new Date(s)) })`
    PUT: ReturnType<typeof endpoint<StandardSchemaV1<{ at: string }, { at: Date }>, Params, null>>;
  }>;
  const call = <F extends (...args: any) => any>(_: F, ...args: Parameters<F>) => args;
  const methods = {} as Methods;
  // 有默认值时可以省略
  call(methods.POST);
  call(methods.POST, {});
  call(methods.POST, { count: 1 });
  // @ts-expect-error
  call(methods.POST, { count: '1' });
  // 转换的输入是 `unknown`，使用输出类型
  call(methods.GET, { page: 2 });
  // @ts-expect-error
  call(methods.GET, { page: 'x' });
  // @ts-expect-error 必须传入
  call(methods.GET);
  // `transform` 之前的类型
  call(methods.PUT, { at: '2026-01-01' });
  // @ts-expect-error
  call(methods.PUT, { at: new Date() });
  // 处理函数得到的是输出类型
  endpoint(schema<{ count?: number } | undefined, { count: number }>(), (_, { count }) => count.toFixed());
});

test('Jsonify: JSON 序列化后的类型', () => {
  type Data = Jsonify<{
    date: Date;
    count: number;
    optional?: string;
    nested: { fn: () => void; list: (string | undefined)[]; at: Date[] };
    skipped: undefined;
  }>;
  const data: Data = { date: '', count: 1, nested: { list: ['a', null], at: [''] } };
  // @ts-expect-error `Date` 转换成字符串
  data.date = new Date();
  // @ts-expect-error 函数和值为 `undefined` 的字段被去掉
  data.nested.fn;
  // @ts-expect-error
  data.skipped;
  const optional: string | undefined = data.optional;
  const any: Jsonify<any> = 1;
  void [optional, any];
});

test('MergeActions: 从外到内合并 actions，内层同名的覆盖外层的', () => {
  type Root = { actions: { logout: () => 'root'; shared: () => 'root' } };
  type Blog = { actions: { shared: () => 'blog' } };
  type Page = { load: () => null };
  const { logout, shared } = formActions<MergeActions<[Root, Blog, Page]>>();
  logout((data) => {
    const value: 'root' | undefined = data;
    return value;
  });
  shared((data) => {
    // @ts-expect-error 被内层的覆盖
    const value: 'root' | undefined = data;
    return value;
  });
  // @ts-expect-error 没有 actions 的模块
  formActions<MergeActions<[Page]>>().logout;
});
