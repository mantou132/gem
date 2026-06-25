import { createRequire } from 'node:module';

import { transform } from '@swc/core';
import type { UnpluginFactory } from 'unplugin';
import { createUnplugin } from 'unplugin';

import type { UnpluginGemOptions } from './types';

export type { UnpluginGemOptions } from './types';

const TRANSFORM_EXTENSIONS = /\.(tsx?|jsx?)$/;
const require = createRequire(import.meta.url);

const toArray = <T>(value: T | T[] | undefined) => (value === undefined ? [] : Array.isArray(value) ? value : [value]);

const cleanId = (id: string) => id.replace(/\?.*$/, '');

const matches = (id: string, pattern: string | RegExp) =>
  typeof pattern === 'string' ? id.includes(pattern) : pattern.test(id);

export const unpluginFactory: UnpluginFactory<UnpluginGemOptions | undefined> = (options = {}) => {
  const swcPluginPath = require.resolve('swc-plugin-gem');
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
                    hmr: options.hmr ?? false,
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
  };
};

export const unplugin = /* #__PURE__ */ createUnplugin(unpluginFactory);

export default unplugin;
