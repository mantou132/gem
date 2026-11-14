// 跳转和错误，`load`、`actions`、`handle` 和 API 路由中使用

import { history } from '@mantou/gem';

import type { SchemaIssue } from './types';

export class Redirect {
  constructor(
    public status: number,
    public location: string,
  ) {}
}

/**
 * `/` 开头的应用路径加上当前语言的前缀（`basePath`），和 `history.push` 一样，其他地址（例如完整的 URL）不变；
 * API 路由没有语言，`$gemkit/api` 在客户端加上当前页面的前缀
 */
export function localizeLocation(location: string) {
  const { basePath } = history;
  if (!basePath || !location.startsWith('/') || location.startsWith('//')) return location;
  return location === '/' ? basePath : basePath + location;
}

/**
 * 在 `handle`、`load`、`actions` 或 API 路由中跳转到 `location`，`/` 开头的应用路径不包含语言前缀，
 * 和 `path` 一样，跳转到当前语言的页面，跳转到其他语言时使用完整的 URL
 *
 * 表单提交时总是使用 303 跳转，`$gemkit/api` 调用时客户端导航
 */
export function redirect(status: 301 | 302 | 303 | 307 | 308, location: string): never {
  throw new Redirect(status, localizeLocation(location));
}

/** `fail` 的返回值，表示 action 没有成功，例如表单校验失败 */
export class ActionFailure<T = undefined> {
  constructor(
    public status: number,
    public data: T,
  ) {}
}

/**
 * 在 `actions` 中返回，表示 action 没有成功（例如表单校验失败），`status` 是 4xx 状态码，`data` 必须是 JSON
 *
 * 原生表单提交时不跳转，使用 `status` 渲染当前页面，`actionStore` 中有这次提交的结果，所以没有 JS 时页面也能显示错误；
 * `submitAction` 提交时不重新加载数据，返回 `data`
 *
 * @example
 * ```ts
 * export const actions = {
 *   login: async ({ request }) => {
 *     const form = await request.formData();
 *     if (!form.get('name')) return fail(400, { error: 'required' });
 *   },
 * };
 * ```
 */
export function fail(status: number): ActionFailure;
export function fail<T>(status: number, data: T): ActionFailure<T>;
export function fail<T>(status: number, data?: T) {
  return new ActionFailure(status, data);
}

/** 错误页面（`_error`）的 `data`，以及 API 路由的错误响应，`issues` 是 schema 校验的问题 */
export interface ErrorData {
  status: number;
  message: string;
  issues?: readonly SchemaIssue[];
}

export class HttpError extends Error implements ErrorData {
  name = 'HttpError';

  constructor(
    public status: number,
    message: string,
    public issues?: readonly SchemaIssue[],
  ) {
    super(message);
  }
}

/** 出错的路由，错误页面渲染在它的位置，`tag` 是它的标签名 */
export type RouteError = ErrorData & { tag: string };

/**
 * 在 `handle`、`load`、`actions` 或 API 路由中抛出错误，页面中渲染错误页面（`_error`），地址不变，API 路由响应 JSON 错误
 *
 * `load` 中出错时，错误页面渲染在该页面或 layout 的位置，上层的 layout 保留
 */
export function error(status: number, message = ''): never {
  throw new HttpError(status, message);
}

/** 路由参数对应的内容不存在，例如文章不存在，等同于 `error(404, 'Not Found')` */
export function notFound(): never {
  error(404, 'Not Found');
}
