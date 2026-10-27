import type { PlatformContext, PlatformEnv } from '../../data';
import { createFetchHandler, type Handler, type IsrStore } from '../../handler';
import type { Renderer } from '../../server';

/** Cloudflare KV 中使用的部分 */
interface KVNamespace {
  getWithMetadata<M>(key: string): Promise<{ value: string | null; metadata: M | null }>;
  put(key: string, value: string, options?: { metadata?: unknown }): Promise<void>;
  delete(key: string): Promise<void>;
}

/** ISR 的 KV 存储，写入时间保存在 metadata 中 */
function createKvStore(kv: KVNamespace): IsrStore {
  return {
    async get(file) {
      const { value, metadata } = await kv.getWithMetadata<{ time: number }>(file);
      return value === null || !metadata ? undefined : { content: value, time: metadata.time };
    },
    set: (files) => {
      const metadata = { time: Date.now() };
      return Promise.all([...files].map(([file, content]) => kv.put(file, content, { metadata })));
    },
    delete: (files) => Promise.all(files.map((file) => kv.delete(file))),
  };
}

export interface CloudflareEnv {
  /** 绑定后设置了 `revalidate` 的页面使用 ISR，否则每次请求都渲染 */
  GEMKIT_CACHE?: KVNamespace;
}

/**
 * Cloudflare Workers，静态文件由 Workers Static Assets 提供，
 * Worker 的 Cache API 在 `workers.dev` 上不可用，所以 ISR 使用 KV；
 * `platform` 是 Worker 的 `env`（绑定）和 `ctx`（`ExecutionContext`）
 */
export function createHandler(renderer: Renderer, template: string) {
  // KV 只能在请求中从 `env` 获取
  let handler: Handler | undefined;
  return {
    fetch(request: Request, env: CloudflareEnv & PlatformEnv, ctx: PlatformContext) {
      const kv = env.GEMKIT_CACHE;
      handler ||= createFetchHandler(renderer, template, { isrStore: kv && createKvStore(kv) });
      return handler(request, { env, ctx });
    },
  };
}
