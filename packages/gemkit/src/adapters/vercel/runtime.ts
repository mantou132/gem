import { getRequestListener } from '@hono/node-server';

import { CDN_STALE_SECONDS } from '../../constants';
import { createFetchHandler, withOrigin } from '../../handler';
import type { Renderer } from '../../server';

/** Vercel Node.js Functions，静态文件优先，ISR 使用 Vercel 的 CDN 缓存 */
export function createHandler(renderer: Renderer, template: string) {
  const handler = createFetchHandler(renderer, template, {
    cdnCache: (revalidate) => [
      'vercel-cdn-cache-control',
      `s-maxage=${revalidate}, stale-while-revalidate=${CDN_STALE_SECONDS}`,
    ],
  });
  // 函数收到的请求协议总是 `http:`，使用 Vercel 设置的 `x-forwarded-proto`
  return getRequestListener((request) => {
    const proto = request.headers.get('x-forwarded-proto');
    return handler(proto ? withOrigin(request, `${proto}://${new URL(request.url).host}`) : request);
  });
}
