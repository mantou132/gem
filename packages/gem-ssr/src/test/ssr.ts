import path from 'node:path';
import { after } from 'node:test';
import { Worker } from 'node:worker_threads';

// 服务端渲染在 worker 中执行，和客户端的 DOM 环境隔离
const worker = new Worker(`require('tsx/cjs');require(${JSON.stringify(path.join(__dirname, 'ssr-worker.ts'))})`, {
  eval: true,
});
after(() => worker.terminate());

let id = 0;
const pending = new Map<number, { resolve: (html: string) => void; reject: (err: unknown) => void }>();
worker.on('error', (error) => {
  pending.forEach(({ reject }) => reject(error));
  pending.clear();
});
worker.on('message', ({ id, html, error }) => {
  const { resolve, reject } = pending.get(id)!;
  pending.delete(id);
  error ? reject(error) : resolve(html);
});

/** 在服务端渲染 fixture 模块导出的函数的返回值，返回值也可以是 `[result, options]` */
export function ssr(fixture: string, name: string, ...args: unknown[]) {
  return new Promise<string>((resolve, reject) => {
    pending.set(++id, { resolve, reject });
    worker.postMessage({ id, file: path.join(__dirname, 'fixtures', fixture), name, args });
  });
}
