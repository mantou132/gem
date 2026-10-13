import { parentPort } from 'node:worker_threads';

import { renderToString } from '../index';

parentPort!.on('message', async ({ id, file, name, args }) => {
  try {
    const value = require(file)[name](...args);
    const [result, options] = Array.isArray(value) ? value : [value];
    parentPort!.postMessage({ id, html: await renderToString(result, options) });
  } catch (error) {
    parentPort!.postMessage({ id, error });
  }
});
