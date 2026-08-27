/**
 * Auto import configuration
 */
export type AutoImportConfig =
  | boolean
  | {
      extends?: 'gem';
      members?: Record<string, string[]>;
      elements?: Record<string, Record<string, string>>;
    };

/**
 * HMR API emitted by the SWC transform.
 */
export type HmrTarget = 'webpack-hot' | 'import-meta-hot' | 'module-hot' | 'none';

/**
 * HMR runtime and entry injection options.
 */
export interface HmrOptions {
  /**
   * Runtime helper module, resolved from the project
   * @default '@mantou/gem/helper/hmr'
   */
  helper?: string;

  /**
   * HMR API emitted by the SWC transform.
   * @default The native API for the selected bundler (`webpack-hot` for webpack/Rspack,
   * `import-meta-hot` for the other supported bundlers).
   * Set to `none` to disable both the HMR transform and runtime injection.
   */
  target?: HmrTarget;

  /**
   * Entry names/paths to prepend the helper to,
   * matched against the entry name and its import paths
   */
  include?: string | RegExp | Array<string | RegExp>;

  /**
   * Entry and module names/paths to skip.
   * Defaults to skipping service worker / background / content script / SSR paths.
   */
  exclude?: string | RegExp | Array<string | RegExp>;
}

/**
 * Auto import .d.ts generation
 */
export type AutoImportDts = boolean | string;

/**
 * Plugin options matching swc-plugin-gem configuration
 */
export interface UnpluginGemOptions {
  /**
   * Files to transform
   */
  include?: string | RegExp | Array<string | RegExp>;

  /**
   * Files to skip
   */
  exclude?: string | RegExp | Array<string | RegExp>;

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
   *
   * Turns on the SWC HMR transform and automatically injects
   * `@mantou/gem/helper/hmr` so you do not import the runtime yourself.
   *
   * Service worker / background / content script / SSR entries are skipped by
   * default. Node-targeted webpack, Rspack, and esbuild builds are also skipped.
   * @default false
   */
  hmr?: boolean | HmrOptions;

  /**
   * Support `&:hover` in shadow DOM and light DOM
   * Transform to `:is(&:hover,:host(:hover))`
   * @default false
   */
  selectorCompatible?: boolean;
}
