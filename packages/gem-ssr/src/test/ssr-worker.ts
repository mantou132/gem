import { parentPort } from 'node:worker_threads';

import { renderToString, runInRequest } from '../index';

parentPort!.on('message', async ({ id, file, name, args }) => {
  try {
    // 在请求中执行，fixture 可以设置请求的状态
    const html = await runInRequest(() => {
      const value = require(file)[name](...args);
      const [result, options] = Array.isArray(value) ? value : [value];
      return renderToString(result, options);
    });
    parentPort!.postMessage({ id, html });
  } catch (error) {
    parentPort!.postMessage({ id, error });
  }
});
