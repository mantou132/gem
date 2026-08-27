import { createRequire } from 'node:module';
import path from 'node:path';

import { transform } from '@swc/core';
import type { UnpluginFactory } from 'unplugin';
import { createUnplugin } from 'unplugin';

import {
  createEntryProxyCode,
  createEsbuildHmrPlan,
  createRuntimeModuleCode,
  decodeVirtualEntry,
  getHmrFilters,
  getHmrTarget,
  getHmrTransformTarget,
  HMR_RUNTIME_ID_PATTERN,
  injectEsbuildHelper,
  isHmrRuntimeId,
  isNonDomWebpackTarget,
  loadRollupHmrId,
  prependGemHmrEntry,
  resolveHelperFromContext,
  resolveRollupHmrId,
  shouldInjectHmr,
  VIRTUAL_RUNTIME_ID,
  VIRTUAL_RUNTIME_PUBLIC,
  wrapRollupInput,
} from './hmr.js';
import type { UnpluginGemOptions } from './types.js';
import { cleanId, matchesFilter, toArray } from './utils.js';

export type { HmrOptions, HmrTarget, UnpluginGemOptions } from './types.js';

const TRANSFORM_EXTENSIONS = /\.(?:[cm]?[jt]s|[jt]sx)(?:[?#].*)?$/;
const require = createRequire(import.meta.url);

export const unpluginFactory: UnpluginFactory<UnpluginGemOptions | undefined> = (options = {}, meta) => {
  const swcPluginPath = require.resolve('swc-plugin-gem');
  const hmrTarget = getHmrTarget(options, meta.framework);
  const { helper, include: hmrInclude, exclude: hmrExclude } = getHmrFilters(options);
  const moduleInclude = toArray(options.include);
  const moduleExclude = toArray(options.exclude);
  let nonDomBuild = false;
  let esbuildUsesEntryProxy = false;

  return {
    name: 'unplugin-gem',
    enforce: 'pre',

    transform: {
      filter: { id: TRANSFORM_EXTENSIONS },
      async handler(code, id, transformOptions?: { ssr?: boolean }) {
        if (!TRANSFORM_EXTENSIONS.test(id)) return;
        const filename = cleanId(id);
        if (moduleInclude.length && !moduleInclude.some((pattern) => matchesFilter(filename, pattern))) return;
        if (moduleExclude.some((pattern) => matchesFilter(filename, pattern))) return;
        if (isHmrRuntimeId(filename, helper) || decodeVirtualEntry(filename)) return;

        try {
          const moduleHmrTarget = getHmrTransformTarget(hmrTarget, filename, hmrExclude, {
            nonDom: nonDomBuild,
            ssr: transformOptions?.ssr,
          });
          const result = await transform(code, {
            filename,
            sourceMaps: true,
            jsc: {
              parser: {
                syntax: /\.(?:[cm]?ts|tsx)$/.test(filename) ? 'typescript' : 'ecmascript',
                tsx: filename.endsWith('.tsx'),
                jsx: filename.endsWith('.jsx'),
                decorators: true,
              },
              transform: {
                decoratorVersion: '2023-11',
              },
              externalHelpers: true,
              target: 'es2024',
              experimental: {
                runPluginFirst: true,
                plugins: [
                  [
                    swcPluginPath,
                    {
                      styleMinify: options.styleMinify ?? false,
                      autoImport: options.autoImport ?? false,
                      autoImportDts: options.autoImportDts ?? false,
                      resolvePath: options.resolvePath ?? false,
                      preload: options.preload ?? false,
                      hmr: moduleHmrTarget,
                      selectorCompatible: options.selectorCompatible ?? false,
                    },
                  ],
                ],
              },
            },
          });

          return {
            code: result.code,
            map: result.map,
          };
        } catch (error) {
          this.error(`Failed to transform ${id}: ${error}`);
        }
      },
    },

    resolveId: {
      filter: { id: HMR_RUNTIME_ID_PATTERN },
      handler(id) {
        if (!hmrTarget || !HMR_RUNTIME_ID_PATTERN.test(id)) return;
        return VIRTUAL_RUNTIME_ID;
      },
    },

    load: {
      filter: { id: HMR_RUNTIME_ID_PATTERN },
      handler(id) {
        if (!hmrTarget || cleanId(id) !== VIRTUAL_RUNTIME_ID) return;
        return createRuntimeModuleCode(helper);
      },
    },

    webpack(compiler) {
      nonDomBuild = isNonDomWebpackTarget(compiler.options.target);
      if (hmrTarget) prependGemHmrEntry(compiler, options);
    },

    rspack(compiler) {
      nonDomBuild = isNonDomWebpackTarget(compiler.options.target);
      if (hmrTarget) prependGemHmrEntry(compiler, options);
    },

    vite: {
      transformIndexHtml: {
        order: 'pre',
        handler(_html, ctx) {
          if (!hmrTarget) return;
          if (ctx.server === undefined) return;
          if (!shouldInjectHmr([ctx.filename, ctx.path, ctx.originalUrl], hmrInclude, hmrExclude)) return;
          return [
            {
              tag: 'script',
              attrs: { type: 'module', src: `/@id/${VIRTUAL_RUNTIME_PUBLIC}` },
              injectTo: 'head-prepend',
            },
          ];
        },
      },
    },

    rollup: {
      options(inputOptions) {
        if (!hmrTarget) return;
        inputOptions.input = wrapRollupInput(inputOptions.input, hmrInclude, hmrExclude);
      },
      resolveId(id) {
        if (!hmrTarget) return;
        return resolveRollupHmrId(this, id);
      },
      load(id) {
        if (!hmrTarget) return;
        return loadRollupHmrId(this, id, helper);
      },
    },

    rolldown: {
      options(inputOptions) {
        if (!hmrTarget) return;
        inputOptions.input = wrapRollupInput(inputOptions.input, hmrInclude, hmrExclude);
      },
      resolveId(id) {
        if (!hmrTarget) return;
        return resolveRollupHmrId(this, id);
      },
      load(id) {
        if (!hmrTarget) return;
        return loadRollupHmrId(this, id, helper);
      },
    },

    esbuild: {
      config(initialOptions) {
        if (!hmrTarget) return;
        esbuildUsesEntryProxy = false;
        nonDomBuild = initialOptions.platform === 'node';
        if (nonDomBuild) return;

        const helperPath = resolveHelperFromContext(initialOptions.absWorkingDir, helper);
        if (!helperPath) return;

        if (initialOptions.entryPoints) {
          const plan = createEsbuildHmrPlan(initialOptions.entryPoints, hmrInclude, hmrExclude);
          if (plan.strategy === 'inject') {
            initialOptions.inject = injectEsbuildHelper(initialOptions.inject, helperPath, helper);
          } else if (plan.strategy === 'proxy') {
            initialOptions.entryPoints = plan.entryPoints;
            esbuildUsesEntryProxy = true;
          }
          return;
        }

        if (shouldInjectHmr([initialOptions.stdin?.sourcefile], hmrInclude, hmrExclude)) {
          initialOptions.inject = injectEsbuildHelper(initialOptions.inject, helperPath, helper);
        }
      },
      setup(build) {
        if (!hmrTarget || !esbuildUsesEntryProxy) return;

        build.onResolve({ filter: /unplugin-gem-hmr-entry:/ }, (args) => {
          const original = decodeVirtualEntry(args.path);
          if (!original) return;
          return {
            path: path.isAbsolute(original)
              ? original
              : path.resolve(args.resolveDir || build.initialOptions.absWorkingDir || process.cwd(), original),
            namespace: 'unplugin-gem-hmr',
          };
        });

        build.onLoad({ filter: /.*/, namespace: 'unplugin-gem-hmr' }, (args) => ({
          contents: createEntryProxyCode(args.path, helper),
          loader: 'js',
          resolveDir: path.dirname(args.path),
        }));
      },
    },
  };
};

export const unplugin = /* #__PURE__ */ createUnplugin(unpluginFactory);

export default unplugin;
