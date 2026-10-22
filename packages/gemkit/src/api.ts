import { HttpError, type RequestMethod } from './data';

const METHODS = new Set<string>(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] satisfies RequestMethod[]);
// 没有请求体，参数作为查询参数
const QUERY_METHODS = new Set<string>(['GET', 'DELETE'] satisfies RequestMethod[]);

/** API 路由处理函数在客户端的调用签名，第二个参数是输入，返回 `Response` 时得到原始响应 */
export type Endpoint<F> = F extends (ctx: any, ...args: infer A) => infer R
  ? (...args: A) => Promise<Awaited<R> extends Response ? Response : Awaited<R>>
  : never;

/** API 路由模块导出的请求方法 */
export type EndpointMethods<M> = { [K in keyof M & RequestMethod]: Endpoint<M[K]> };

async function request(method: string, segments: string[], input?: Record<string, any>) {
  const query = QUERY_METHODS.has(method);
  const search = query && input ? `?${new URLSearchParams(input)}` : '';
  const res = await fetch(
    `/${segments.join('/')}${search}`,
    query || input === undefined
      ? { method }
      : { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(input) },
  );
  const isJSON = res.headers.get('content-type')?.includes('application/json');
  if (!res.ok) {
    const { status, message } = isJSON ? await res.json() : { status: res.status, message: res.statusText };
    throw new HttpError(status, message);
  }
  return isJSON ? res.json() : res;
}

/**
 * 按路径调用 API 路由，属性是路径的静态部分，调用是动态参数，最后是请求方法，例如
 * `apis.api.likes(slug).POST({ count: 1 })` 请求 `POST /api/likes/<slug>`
 */
export function createApi(segments: string[] = []): any {
  return new Proxy(() => {}, {
    get: (_, key) => {
      // 不是 thenable，避免被 `await` 时当作 Promise
      if (typeof key !== 'string' || key === 'then') return;
      if (METHODS.has(key)) return (input?: Record<string, any>) => request(key, segments, input);
      return createApi([...segments, key]);
    },
    // 剩余参数（`[...path]`）可以传多个
    apply: (_, __, values: string[]) => createApi([...segments, ...values.map(encodeURIComponent)]),
  });
}
