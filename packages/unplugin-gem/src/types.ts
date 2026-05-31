/**
 * Auto import configuration
 */
export type AutoImportConfig =
  | boolean
  | {
      extends?: 'gem';
      members?: Record<string, string[]>;
    };

/**
 * Auto import .d.ts generation
 */
export type AutoImportDts = boolean | string;

/**
 * Plugin options matching swc-plugin-gem configuration
 */
export interface UnpluginGemOptions {
  /**
   * Minify CSS in css`` template literals
   * @default false
   */
  styleMinify?: boolean;

  /**
   * Auto import Gem APIs
   * @default false
   * @example
   * ```ts
   * {
   *   autoImport: {
   *     extends: 'gem',
   *     members: {
   *       'my-package': ['myFunction']
   *     }
   *   }
   * }
   * ```
   */
  autoImport?: AutoImportConfig;

  /**
   * Generate .d.ts file for auto imports
   * @default false
   * @example
   * ```ts
   * // true -> src/auto-import.d.ts
   * // string -> custom path
   * autoImportDts: 'src/types/auto-import.d.ts'
   * ```
   */
  autoImportDts?: AutoImportDts;

  /**
   * Resolve import paths to full ESM paths
   * @default false
   */
  resolvePath?: boolean;

  /**
   * Enable resource preloading with ?preload query
   * @default false
   */
  preload?: boolean;

  /**
   * Enable HMR support (experimental)
   * @default false
   */
  hmr?: boolean;

  /**
   * Support `&:hover` in shadow DOM and light DOM
   * Transform to `:is(&:hover,:host(:hover))`
   * @default false
   */
  selectorCompatible?: boolean;
}
