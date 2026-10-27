import { CDN_STALE_SECONDS } from '../../constants';
import { createFetchHandler, type PlatformContext } from '../../handler';
import type { Renderer } from '../../server';

/** Netlify Functions，静态文件优先，ISR 使用 Netlify 的持久 CDN 缓存 */
export function createHandler(renderer: Renderer, template: string) {
  const handler = createFetchHandler(renderer, template, {
    cdnCache: (revalidate) => [
      'netlify-cdn-cache-control',
      `public, durable, s-maxage=${revalidate}, stale-while-revalidate=${CDN_STALE_SECONDS}`,
    ],
  });
  return (request: Request, context: PlatformContext) => handler(request, context);
}
