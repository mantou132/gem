import { parse, serialize } from 'hono/utils/cookie';

import type { Cookies } from './data';

/** 读取请求的 cookie，修改的 cookie 输出到 `setCookies` */
export function createCookies(request: Request) {
  const values = parse(request.headers.get('cookie') || '');
  const secure = new URL(request.url).protocol === 'https:';
  const setCookies: string[] = [];
  const cookies: Cookies = {
    get: (name) => values[name],
    set: (name, value, options) => {
      values[name] = value;
      setCookies.push(serialize(name, value, { path: '/', httpOnly: true, secure, sameSite: 'Lax', ...options }));
    },
    delete: (name, options) => {
      delete values[name];
      setCookies.push(serialize(name, '', { path: '/', ...options, maxAge: 0 }));
    },
  };
  return { cookies, setCookies };
}
