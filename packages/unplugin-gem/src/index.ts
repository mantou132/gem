import { createRequire } from 'node:module';
import path from 'node:path';

import { transform } from '@swc/core';
import type { UnpluginFactory } from 'unplugin';
import { createUnplugin } from 'unplugin';

import {
  createEntryProxyCode,
  createRuntimeModuleCode,
  decodeVirtualEntry,
  getHmrFilters,
  getHmrTarget,
  injectEsbuildHelper,
  isHmrRuntimeId,
  prependGemHmrEntry,
  resolveHelperFromContext,
  shouldInjectHmr,
  VIRTUAL_RUNTIME_ID,
  VIRTUAL_RUNTIME_PUBLIC,
  wrapEsbuildEntryPoints,
  wrapRollupInput,
} from './hmr';
import type { UnpluginGemOptions } from './types';

export type { HmrOptions, HmrTarget, UnpluginGemOptions } from './types';

const TRANSFORM_EXTENSIONS = /\.(tsx?|jsx?)$/;
const require = createRequire(import.meta.url);

const toArray = <T>(value: T | T[] | undefined) => (value === undefined ? [] : Array.isArray(value) ? value : [value]);

const cleanId = (id: string) => id.replace(/\?.*$/, '');

const matches = (id: string, pattern: string | RegExp) => {
  if (typeof pattern === 'string') return id.includes(pattern);
  pattern.lastIndex = 0;
  return pattern.test(id);
};

export const unpluginFactory: UnpluginFactory<UnpluginGemOptions | undefined> = (options = {}, meta) => {
  const swcPluginPath = require.resolve('swc-plugin-gem');
  const hmrTarget = getHmrTarget(options, meta.framework);
  const { helper, include: hmrInclude, exclude: hmrExclude } = getHmrFilters(options);
  const helperSpecifier = helper;

  return {
    name: 'unplugin-gem',
    enforce: 'pre',

    transformInclude(id) {
      const clean = cleanId(id);
      const includes = toArray(options.include);
      const excludes = toArray(options.exclude);

      if (!TRANSFORM_EXTENSIONS.test(clean)) return false;
      if (includes.length && !includes.some((pattern) => matches(clean, pattern))) return false;
      if (excludes.some((pattern) => matches(clean, pattern))) return false;

      return true;
    },

    async transform(code, id) {
      if (isHmrRuntimeId(id, helperSpecifier) || decodeVirtualEntry(id)) return;

      try {
        const filename = cleanId(id);
        const result = await transform(code, {
          filename,
          sourceMaps: true,
          jsc: {
            parser: {
              syntax: filename.endsWith('.tsx') || filename.endsWith('.ts') ? 'typescript' : 'ecmascript',
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
                    hmr: hmrTarget,
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

    loadInclude(id) {
      if (!options.hmr) return;
      const clean = cleanId(id);
      return Boolean(decodeVirtualEntry(clean)) || clean === VIRTUAL_RUNTIME_ID || clean === VIRTUAL_RUNTIME_PUBLIC;
    },

    resolveId(id) {
      if (!options.hmr) return;
      if (id === VIRTUAL_RUNTIME_ID || id === VIRTUAL_RUNTIME_PUBLIC) return VIRTUAL_RUNTIME_ID;
      if (decodeVirtualEntry(id)) return id;
    },

    load(id) {
      if (!options.hmr) return;
      if (id === VIRTUAL_RUNTIME_ID) return createRuntimeModuleCode(helperSpecifier);
      const original = decodeVirtualEntry(id);
      if (original) return createEntryProxyCode(original, helperSpecifier);
    },

    webpack(compiler) {
      prependGemHmrEntry(compiler, options);
    },

    rspack(compiler) {
      prependGemHmrEntry(compiler, options);
    },

    vite: {
      transformIndexHtml: {
        order: 'pre',
        handler(_html, ctx) {
          if (!options.hmr) return;
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
        if (!options.hmr) return;
        inputOptions.input = wrapRollupInput(
          inputOptions.input as string | string[] | Record<string, string>,
          hmrInclude,
          hmrExclude,
        );
      },
    },

    rolldown: {
      options(inputOptions) {
        if (!options.hmr) return;
        inputOptions.input = wrapRollupInput(
          inputOptions.input as string | string[] | Record<string, string>,
          hmrInclude,
          hmrExclude,
        );
      },
    },

    esbuild: {
      config(initialOptions) {
        if (!options.hmr) return;
        const helperPath = resolveHelperFromContext(initialOptions.absWorkingDir, helperSpecifier);
        if (!helperPath) return;
        if (hmrInclude.length) {
          const entries = wrapEsbuildEntryPoints(initialOptions.entryPoints, hmrInclude, hmrExclude);
          if (entries) initialOptions.entryPoints = entries;
          return;
        }
        initialOptions.inject = injectEsbuildHelper(initialOptions.inject, helperPath);
      },
      setup(build) {
        if (!options.hmr || !hmrInclude.length) return;

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
          contents: createEntryProxyCode(args.path, helperSpecifier),
          loader: 'js',
          resolveDir: path.dirname(args.path),
        }));
      },
    },
  };
};

export const unplugin = /* #__PURE__ */ createUnplugin(unpluginFactory);

export default unplugin;
