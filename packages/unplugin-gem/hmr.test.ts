import assert from 'node:assert/strict';
import { mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { rspack } from '@rspack/core';
import { build as esbuild } from 'esbuild';
import { rolldown } from 'rolldown';
import { rollup } from 'rollup';
import { createServer } from 'vite';
import webpack from 'webpack';

import {
  createEntryProxyCode,
  createEsbuildHmrPlan,
  DEFAULT_EXCLUDE,
  DEFAULT_HELPER,
  encodeVirtualEntry,
  getHmrTarget,
  getHmrTransformTarget,
  injectEsbuildHelper,
  isNonDomWebpackTarget,
  loadRollupHmrId,
  prependGemHmrEntry,
  prependToWebpackEntry,
  resolveRollupHmrId,
  shouldInjectHmr,
  VIRTUAL_RUNTIME_ID,
  VIRTUAL_RUNTIME_PUBLIC,
  wrapRollupInput,
} from './dist/hmr.js';
import { unplugin } from './dist/index.js';
import rspackPlugin from './dist/rspack.js';
import vitePlugin from './dist/vite.js';
import webpackPlugin from './dist/webpack.js';

interface BundlerStats {
  hasErrors(): boolean;
  toString(options?: unknown): string;
}

interface BundlerCompiler {
  run(callback: (error?: Error | null, stats?: BundlerStats) => void): void;
  close(callback: (error?: Error | null) => void): void;
}

const runCompiler = (compiler: BundlerCompiler) =>
  new Promise<void>((resolve, reject) => {
    compiler.run((error, stats) => {
      const finish = (buildError?: Error | null) => {
        compiler.close((closeError) => {
          if (buildError || closeError) reject(buildError || closeError);
          else resolve();
        });
      };

      if (error) finish(error);
      else if (stats?.hasErrors()) finish(new Error(stats.toString({ all: false, errors: true })));
      else finish();
    });
  });

test('getHmrTarget uses the bundler native API', () => {
  assert.equal(getHmrTarget({ hmr: true }, 'webpack'), 'webpack-hot');
  assert.equal(getHmrTarget({ hmr: true }, 'rspack'), 'webpack-hot');
  assert.equal(getHmrTarget({ hmr: true }, 'vite'), 'import-meta-hot');
  assert.equal(getHmrTarget({ hmr: true }, 'rollup'), 'import-meta-hot');
  assert.equal(getHmrTarget({ hmr: true }, 'esbuild'), 'import-meta-hot');
  assert.equal(getHmrTarget({ hmr: { target: 'module-hot' } }, 'vite'), 'module-hot');
  assert.equal(getHmrTarget({ hmr: { target: 'none' } }, 'vite'), false);
  assert.equal(getHmrTarget({}, 'webpack'), false);
});

test('shouldInjectHmr skips service worker and ssr entries', () => {
  assert.equal(shouldInjectHmr(['app', './src/main.ts'], [], DEFAULT_EXCLUDE), true);
  assert.equal(shouldInjectHmr(['sw', './src/service-worker.ts'], [], DEFAULT_EXCLUDE), false);
  assert.equal(shouldInjectHmr(['ssr', './src/ssr/index.ts'], [], DEFAULT_EXCLUDE), false);
  assert.equal(shouldInjectHmr(['app', './src/main.ts'], ['app'], DEFAULT_EXCLUDE), true);
  assert.equal(shouldInjectHmr(['other', './src/main.ts'], ['app'], DEFAULT_EXCLUDE), false);
});

test('getHmrTransformTarget skips SSR, excluded modules, and non-DOM builds', () => {
  assert.equal(getHmrTransformTarget('import-meta-hot', '/src/main.ts', DEFAULT_EXCLUDE), 'import-meta-hot');
  assert.equal(getHmrTransformTarget('import-meta-hot', '/src/service-worker.ts', DEFAULT_EXCLUDE), false);
  assert.equal(getHmrTransformTarget('import-meta-hot', '/src/main.ts', DEFAULT_EXCLUDE, { ssr: true }), false);
  assert.equal(getHmrTransformTarget('webpack-hot', '/src/main.ts', DEFAULT_EXCLUDE, { nonDom: true }), false);
  assert.equal(isNonDomWebpackTarget('web'), false);
  assert.equal(isNonDomWebpackTarget('node20'), true);
  assert.equal(isNonDomWebpackTarget(['es2022', 'webworker']), true);
});

test('prependToWebpackEntry prepends helper to supported shapes', async () => {
  const helper = '/abs/helper/hmr.js';
  assert.deepEqual(prependToWebpackEntry('./src/main.ts', helper, DEFAULT_HELPER, [], DEFAULT_EXCLUDE), [
    helper,
    './src/main.ts',
  ]);
  assert.deepEqual(
    prependToWebpackEntry(
      { app: { import: './src/main.ts', runtime: 'runtime' } },
      helper,
      DEFAULT_HELPER,
      [],
      DEFAULT_EXCLUDE,
    ),
    { app: { import: [helper, './src/main.ts'], runtime: 'runtime' } },
  );
  assert.deepEqual(prependToWebpackEntry({ import: './src/main.ts' }, helper, DEFAULT_HELPER, ['import'], []), {
    import: [helper, './src/main.ts'],
  });
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

  const disabledCompiler = { options: { entry: './src/main.ts' } };
  prependGemHmrEntry(disabledCompiler, { hmr: { target: 'none' } });
  assert.equal(disabledCompiler.options.entry, './src/main.ts');
});

test('wrapRollupInput wraps selected entries instead of adding a sibling input', () => {
  assert.equal(wrapRollupInput('./src/main.ts', [], DEFAULT_EXCLUDE), encodeVirtualEntry('./src/main.ts'));
  assert.deepEqual(wrapRollupInput(['./src/main.ts', './src/service-worker.ts'], [], DEFAULT_EXCLUDE), [
    encodeVirtualEntry('./src/main.ts'),
    './src/service-worker.ts',
  ]);
  const proxy = createEntryProxyCode('./src/main.ts', DEFAULT_HELPER);
  assert.match(proxy, /import "@mantou\/gem\/helper\/hmr"/);
  assert.doesNotMatch(proxy, /export \{ default \}/);
  assert.match(createEntryProxyCode('./src/main.ts', DEFAULT_HELPER, true), /export \{ default \}/);
});

test('createEsbuildHmrPlan chooses one injection strategy per output', () => {
  assert.deepEqual(injectEsbuildHelper(['./polyfill.js'], '/abs/helper/hmr.js'), [
    '/abs/helper/hmr.js',
    './polyfill.js',
  ]);
  assert.deepEqual(injectEsbuildHelper(['custom-hmr'], '/abs/custom-hmr.js', 'custom-hmr'), ['custom-hmr']);

  const partialPlan = createEsbuildHmrPlan(
    { app: './src/main.ts', sw: './src/service-worker.ts' },
    [],
    DEFAULT_EXCLUDE,
  );
  assert.equal(partialPlan.strategy, 'proxy');
  assert.deepEqual(partialPlan.entryPoints, {
    app: encodeVirtualEntry('./src/main.ts', true),
    sw: './src/service-worker.ts',
  });
  const injectPlan = createEsbuildHmrPlan({ app: './src/main.ts' }, [], DEFAULT_EXCLUDE);
  assert.equal(injectPlan.strategy, 'inject');
  assert.deepEqual(injectPlan.entryPoints, { app: './src/main.ts' });
  assert.equal(createEsbuildHmrPlan({ sw: './src/service-worker.ts' }, [], DEFAULT_EXCLUDE).strategy, 'skip');
});

test('package ESM entry points load directly in Node', async () => {
  for (const entry of ['index', 'vite', 'webpack', 'rspack', 'rollup', 'rolldown', 'esbuild']) {
    const module = await import(entry === 'index' ? 'unplugin-gem' : `unplugin-gem/${entry}`);
    assert.equal(typeof module.default, entry === 'index' ? 'object' : 'function');
  }
});

test('Vite dev pipeline resolves and loads the injected HMR runtime', async (context) => {
  const fixture = await realpath(await mkdtemp(path.join(tmpdir(), 'unplugin-gem-vite-')));
  context.after(() => rm(fixture, { recursive: true }));
  await Promise.all([
    writeFile(path.join(fixture, 'main.ts'), 'export const app: boolean = true;'),
    writeFile(path.join(fixture, 'helper.ts'), 'globalThis.__gemHmrViteTest = true;'),
  ]);

  const server = await createServer({
    appType: 'custom',
    logLevel: 'silent',
    root: fixture,
    server: { middlewareMode: true },
    plugins: [vitePlugin({ hmr: { helper: path.join(fixture, 'helper.ts') } })],
  });
  context.after(() => server.close());

  const html = await server.transformIndexHtml('/index.html', '<script type="module" src="/main.ts"></script>');
  assert.match(html, new RegExp(VIRTUAL_RUNTIME_PUBLIC));

  const resolvedRuntime = await server.pluginContainer.resolveId(VIRTUAL_RUNTIME_PUBLIC);
  assert.equal(resolvedRuntime?.id, VIRTUAL_RUNTIME_ID);
  const loadedRuntime = resolvedRuntime && (await server.pluginContainer.load(resolvedRuntime.id));
  const runtimeCode = typeof loadedRuntime === 'string' ? loadedRuntime : loadedRuntime?.code;
  assert.match(runtimeCode ?? '', /helper\.ts/);

  const transformedMain = await server.transformRequest('/main.ts');
  assert.match(transformedMain?.code ?? '', /export const app = true/);
  assert.doesNotMatch(transformedMain?.code ?? '', /: boolean/);
});

for (const [name, createCompiler, plugin] of [
  ['Webpack', webpack, webpackPlugin],
  ['Rspack', rspack, rspackPlugin],
] as const) {
  test(`${name} keeps HMR helper out of service worker entries`, async (context) => {
    const fixture = await mkdtemp(path.join(tmpdir(), `unplugin-gem-${name.toLowerCase()}-`));
    context.after(() => rm(fixture, { recursive: true }));
    await Promise.all([
      writeFile(path.join(fixture, 'main.ts'), 'export const app: boolean = true;'),
      writeFile(path.join(fixture, 'service-worker.ts'), 'export const worker: boolean = true;'),
      writeFile(path.join(fixture, 'helper.ts'), 'globalThis.__gemHmrBundlerTest = true;'),
    ]);

    const outputPath = path.join(fixture, 'output');
    const compiler = createCompiler({
      context: fixture,
      entry: { app: './main.ts', sw: './service-worker.ts' },
      mode: 'development',
      output: { filename: '[name].js', path: outputPath },
      plugins: [plugin({ hmr: { helper: path.join(fixture, 'helper.ts') } })],
    });
    await runCompiler(compiler);

    const [app, worker] = await Promise.all([
      readFile(path.join(outputPath, 'app.js'), 'utf8'),
      readFile(path.join(outputPath, 'sw.js'), 'utf8'),
    ]);
    assert.match(app, /__gemHmrBundlerTest/);
    assert.doesNotMatch(worker, /__gemHmrBundlerTest/);
  });
}

test('esbuild isolates browser HMR from worker and Node outputs', async (context) => {
  const fixture = await mkdtemp(path.join(tmpdir(), 'unplugin-gem-hmr-'));
  context.after(() => rm(fixture, { recursive: true }));
  await Promise.all([
    writeFile(path.join(fixture, 'main.ts'), 'export const app = true;'),
    writeFile(
      path.join(fixture, 'service-worker.ts'),
      '@customElement("worker-element") class WorkerElement extends GemElement {} export const worker = true;',
    ),
    writeFile(path.join(fixture, 'helper.ts'), 'globalThis.__gemHmrIntegration = true;'),
  ]);

  const helper = path.join(fixture, 'helper.ts');
  const browserBuild = await esbuild({
    absWorkingDir: fixture,
    entryPoints: { app: './main.ts', sw: './service-worker.ts' },
    outdir: 'browser',
    bundle: true,
    external: ['@swc/helpers/*'],
    format: 'esm',
    write: false,
    plugins: [unplugin.esbuild({ hmr: { helper } })],
  });
  const browserFiles = Object.fromEntries(
    browserBuild.outputFiles.map((file) => [path.basename(file.path), file.text]),
  );
  assert.match(browserFiles['app.js'] ?? '', /__gemHmrIntegration/);
  assert.doesNotMatch(browserFiles['sw.js'] ?? '', /__gemHmrIntegration|_hmrRegisterClass|import\.meta\.hot/);

  const nodeBuild = await esbuild({
    absWorkingDir: fixture,
    entryPoints: { app: './main.ts' },
    outdir: 'server',
    bundle: true,
    format: 'esm',
    platform: 'node',
    write: false,
    plugins: [unplugin.esbuild({ hmr: { helper } })],
  });
  assert.doesNotMatch(nodeBuild.outputFiles[0]?.text ?? '', /__gemHmrIntegration/);
});

test('transform hook excludes HMR code from SSR and worker modules', async () => {
  const plugin = unplugin.raw({ hmr: true }, { framework: 'vite' });
  assert.equal(typeof plugin.transform, 'object');
  const transform = typeof plugin.transform === 'object' ? plugin.transform.handler : plugin.transform;
  assert.ok(transform);

  const source = '@customElement("test-element") class TestElement extends GemElement {}';
  const buildContext = {
    error(error: unknown): never {
      throw error;
    },
  };
  const main = await transform.call(buildContext, source, '/src/main.ts', {});
  const worker = await transform.call(buildContext, source, '/src/service-worker.ts', {});
  const ssr = await transform.call(buildContext, source, '/src/main.ts', { ssr: true });
  assert.match(typeof main === 'object' && main ? main.code : '', /_hmrRegisterClass/);
  for (const result of [worker, ssr]) {
    assert.doesNotMatch(typeof result === 'object' && result ? result.code : '', /_hmrRegisterClass|import\.meta\.hot/);
  }
});

const createRollupLikePlugins = (source: string) => [
  {
    name: 'gem-hmr-test',
    options(inputOptions: { input?: unknown }) {
      inputOptions.input = wrapRollupInput(inputOptions.input as string, [], DEFAULT_EXCLUDE);
    },
    resolveId(this: Parameters<typeof resolveRollupHmrId>[0], id: string) {
      return resolveRollupHmrId(this, id);
    },
    load(this: Parameters<typeof loadRollupHmrId>[0], id: string) {
      return loadRollupHmrId(this, id, 'hmr-helper');
    },
  },
  {
    name: 'gem-hmr-fixture',
    resolveId(id: string) {
      if (id === './src/main.ts') return '/virtual/src/main.ts';
      if (id === 'hmr-helper') return '/virtual/hmr-helper.js';
      if (id === '/virtual/src/main.ts' || id === '/virtual/hmr-helper.js') return id;
    },
    load(id: string) {
      if (id === '/virtual/src/main.ts') return source;
      if (id === '/virtual/hmr-helper.js') return 'globalThis.__gemHmrTest = true;';
    },
  },
];

for (const [name, bundle] of [
  ['Rollup', rollup],
  ['Rolldown', rolldown],
] as const) {
  test(`${name} resolves relative HMR entries and preserves their real exports`, async () => {
    const namedBundle = await bundle({
      input: './src/main.ts',
      plugins: createRollupLikePlugins('export const value = 1;'),
    });
    const namedOutput = await namedBundle.generate({ format: 'es' });
    const namedChunk = namedOutput.output.find((item) => item.type === 'chunk');
    assert.deepEqual(namedChunk?.exports, ['value']);
    assert.match(namedChunk?.code ?? '', /__gemHmrTest/);

    const defaultBundle = await bundle({
      input: './src/main.ts',
      plugins: createRollupLikePlugins('export default 1; export const value = 2;'),
    });
    const defaultOutput = await defaultBundle.generate({ format: 'es' });
    const defaultChunk = defaultOutput.output.find((item) => item.type === 'chunk');
    assert.deepEqual(new Set(defaultChunk?.exports), new Set(['default', 'value']));
  });
}
