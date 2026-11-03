import { CLIENT_HEADER, REDIRECT_HEADER } from './constants';
import { clearClientCache, HttpError, localizeLocation, navigate, type RequestMethod } from './data';

const METHODS = new Set<string>(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] satisfies RequestMethod[]);
// 没有请求体，参数作为查询参数
const QUERY_METHODS = new Set<string>(['GET', 'DELETE'] satisfies RequestMethod[]);

/** `GET` `DELETE` 的输入作为查询参数，只能是简单的值，值为 `undefined` 的字段不发送 */
type QueryInput = Record<string, string | number | boolean | undefined>;

/** 查询参数的输入，不能表示的字段（例如数组、对象）类型为 `never` */
type QueryArgs<A extends unknown[]> = { [I in keyof A]: A[I] & QueryInput };

/**
 * API 路由处理函数在客户端的调用签名，第二个参数是输入，返回 `Response` 时得到原始响应，
 * `M` 是请求方法
 */
export type Endpoint<F, M extends RequestMethod = RequestMethod> = F extends (ctx: any, ...args: infer A) => infer R
  ? (
      ...args: M extends 'GET' | 'DELETE' ? QueryArgs<A> : A
    ) => Promise<Awaited<R> extends Response ? Response : Awaited<R>>
  : never;

/** API 路由模块导出的请求方法 */
export type EndpointMethods<M> = { [K in keyof M & RequestMethod]: Endpoint<M[K], K> };

function toSearch(input: QueryInput) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) params.set(key, String(value));
  }
  const search = String(params);
  return search && `?${search}`;
}

async function request(method: string, segments: string[], input?: Record<string, any>) {
  const query = QUERY_METHODS.has(method);
  const search = query && input ? toSearch(input) : '';
  const res = await fetch(
    `/${segments.join('/')}${search}`,
    query || input === undefined
      ? { method, headers: { [CLIENT_HEADER]: '1' } }
      : { method, headers: { 'content-type': 'application/json', [CLIENT_HEADER]: '1' }, body: JSON.stringify(input) },
  );
  // `handle` 或者处理函数中的跳转，例如没有登录或者登录成功，数据可能已经改变；页面离开，不再 resolve
  // API 路由没有语言，应用路径跳转到当前页面的语言
  const redirectTo = res.headers.get(REDIRECT_HEADER);
  if (redirectTo) {
    clearClientCache();
    navigate(localizeLocation(redirectTo));
    return new Promise(() => {});
  }
  const isJSON = res.headers.get('content-type')?.includes('application/json');
  if (!res.ok) {
    const { status, message, issues } = isJSON ? await res.json() : { status: res.status, message: res.statusText };
    throw new HttpError(status, message, issues);
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
