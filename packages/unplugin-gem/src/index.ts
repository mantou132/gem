import { transform } from '@swc/core';
import type { UnpluginFactory } from 'unplugin';
import { createUnplugin } from 'unplugin';

import type { UnpluginGemOptions } from './types';

export type { UnpluginGemOptions } from './types';

const TRANSFORM_EXTENSIONS = /\.(tsx?|jsx?)$/;

export const unpluginFactory: UnpluginFactory<UnpluginGemOptions | undefined> = (options = {}) => ({
  name: 'unplugin-gem',

  transformInclude(id) {
    return TRANSFORM_EXTENSIONS.test(id);
  },

  async transform(code, id) {
    try {
      const result = await transform(code, {
        filename: id,
        sourceMaps: true,
        jsc: {
          parser: {
            syntax: id.endsWith('.tsx') || id.endsWith('.ts') ? 'typescript' : 'ecmascript',
            tsx: id.endsWith('.tsx'),
            jsx: id.endsWith('.jsx'),
            decorators: true,
          },
          transform: {
            decoratorVersion: '2023-11',
          },
          externalHelpers: true,
          target: 'es2022',
          experimental: {
            runPluginFirst: true,
            plugins: [
              [
                'swc-plugin-gem',
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
});

export const unplugin = /* #__PURE__ */ createUnplugin(unpluginFactory);

export default unplugin;
