import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createEntryProxyCode,
  DEFAULT_EXCLUDE,
  DEFAULT_HELPER,
  encodeVirtualEntry,
  getHmrTarget,
  injectEsbuildHelper,
  prependToWebpackEntry,
  shouldInjectHmr,
  wrapEsbuildEntryPoints,
  wrapRollupInput,
} from './src/hmr.ts';

test('getHmrTarget uses the bundler native API', () => {
  assert.equal(getHmrTarget({ hmr: true }, 'webpack'), 'webpack-hot');
  assert.equal(getHmrTarget({ hmr: true }, 'rspack'), 'webpack-hot');
  assert.equal(getHmrTarget({ hmr: true }, 'vite'), 'import-meta-hot');
  assert.equal(getHmrTarget({ hmr: true }, 'rollup'), 'import-meta-hot');
  assert.equal(getHmrTarget({ hmr: true }, 'esbuild'), 'import-meta-hot');
  assert.equal(getHmrTarget({ hmr: { target: 'module-hot' } }, 'vite'), 'module-hot');
  assert.equal(getHmrTarget({}, 'webpack'), false);
});

test('shouldInjectHmr skips service worker and ssr entries', () => {
  assert.equal(shouldInjectHmr(['app', './src/main.ts'], [], DEFAULT_EXCLUDE), true);
  assert.equal(shouldInjectHmr(['sw', './src/service-worker.ts'], [], DEFAULT_EXCLUDE), false);
  assert.equal(shouldInjectHmr(['ssr', './src/ssr/index.ts'], [], DEFAULT_EXCLUDE), false);
  assert.equal(shouldInjectHmr(['app', './src/main.ts'], ['app'], DEFAULT_EXCLUDE), true);
  assert.equal(shouldInjectHmr(['other', './src/main.ts'], ['app'], DEFAULT_EXCLUDE), false);
});

test('prependToWebpackEntry prepends helper to supported shapes', async () => {
  const helper = '/abs/helper/hmr.js';
  assert.deepEqual(prependToWebpackEntry('./src/main.ts', helper, DEFAULT_HELPER, [], DEFAULT_EXCLUDE), [
    helper,
    './src/main.ts',
  ]);
  assert.deepEqual(
    prependToWebpackEntry({ import: './src/main.ts', runtime: 'runtime' }, helper, DEFAULT_HELPER, [], DEFAULT_EXCLUDE),
    { import: [helper, './src/main.ts'], runtime: 'runtime' },
  );
  assert.deepEqual(
    prependToWebpackEntry(
      {
        app: './src/main.ts',
        sw: './src/service-worker.ts',
      },
      helper,
      DEFAULT_HELPER,
      [],
      DEFAULT_EXCLUDE,
    ),
    {
      app: [helper, './src/main.ts'],
      sw: './src/service-worker.ts',
    },
  );

  const dynamic = prependToWebpackEntry(
    async () => ({ app: './src/main.ts' }),
    helper,
    DEFAULT_HELPER,
    [],
    DEFAULT_EXCLUDE,
  );
  assert.equal(typeof dynamic, 'function');
  assert.deepEqual(await (dynamic as () => Promise<unknown>)(), { app: [helper, './src/main.ts'] });
});

test('wrapRollupInput wraps selected entries instead of adding a sibling input', () => {
  assert.equal(wrapRollupInput('./src/main.ts', [], DEFAULT_EXCLUDE), encodeVirtualEntry('./src/main.ts'));
  assert.deepEqual(wrapRollupInput(['./src/main.ts', './src/service-worker.ts'], [], DEFAULT_EXCLUDE), [
    encodeVirtualEntry('./src/main.ts'),
    './src/service-worker.ts',
  ]);
  assert.match(createEntryProxyCode('./src/main.ts', DEFAULT_HELPER), /import "@mantou\/gem\/helper\/hmr"/);
});

test('wrapEsbuildEntryPoints and inject keep the helper in one output', () => {
  assert.deepEqual(injectEsbuildHelper(['./polyfill.js'], '/abs/helper/hmr.js'), [
    '/abs/helper/hmr.js',
    './polyfill.js',
  ]);
  assert.deepEqual(
    wrapEsbuildEntryPoints({ app: './src/main.ts', sw: './src/service-worker.ts' }, ['app'], DEFAULT_EXCLUDE),
    {
      app: encodeVirtualEntry('./src/main.ts', true),
      sw: './src/service-worker.ts',
    },
  );
});
