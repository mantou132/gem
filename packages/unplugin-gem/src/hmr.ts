import { createRequire } from 'node:module';
import path from 'node:path';

import type { HmrOptions, HmrTarget, UnpluginGemOptions } from './types.js';
import { cleanId, matchesFilter, toArray } from './utils.js';

export const DEFAULT_HELPER = '@mantou/gem/helper/hmr';
export const VIRTUAL_ENTRY_PREFIX = '\0unplugin-gem-hmr-entry:';
export const PUBLIC_ENTRY_PREFIX = 'unplugin-gem-hmr-entry:';
export const VIRTUAL_RUNTIME_ID = '\0unplugin-gem-hmr-runtime';
export const VIRTUAL_RUNTIME_PUBLIC = 'virtual:unplugin-gem/hmr';
export const HMR_RUNTIME_ID_PATTERN = /^(?:\0unplugin-gem-hmr-runtime|virtual:unplugin-gem\/hmr)(?:[?#].*)?$/;

/** HMR runtime 依赖 DOM API，默认跳过非 DOM 入口 */
export const DEFAULT_EXCLUDE = [
  /service[-_]?worker/i,
  /(^|[\\/])background([\\/]|$)/i,
  /content[-_]?scripts?[\\/]/i,
  /(^|[\\/])ssr([\\/]|$)/i,
];

export const resolveHmrOptions = (options: UnpluginGemOptions = {}): HmrOptions | undefined => {
  if (!options.hmr) return;
  return typeof options.hmr === 'object' ? options.hmr : {};
};

type ActiveHmrTarget = Exclude<HmrTarget, 'none'>;

export const getDefaultHmrTarget = (framework: string): ActiveHmrTarget => {
  if (framework === 'webpack' || framework === 'rspack') return 'webpack-hot';
  return 'import-meta-hot';
};

export const getHmrTarget = (options: UnpluginGemOptions = {}, framework: string): ActiveHmrTarget | false => {
  const hmrOptions = resolveHmrOptions(options);
  if (!hmrOptions) return false;
  const target = hmrOptions.target ?? getDefaultHmrTarget(framework);
  return target === 'none' ? false : target;
};

export const shouldInjectHmr = (
  subjects: Array<string | undefined>,
  include: Array<string | RegExp>,
  exclude: Array<string | RegExp>,
) => {
  const values = subjects.filter((value): value is string => Boolean(value));
  if (include.length && !include.some((pattern) => values.some((subject) => matchesFilter(subject, pattern)))) {
    return false;
  }
  return !exclude.some((pattern) => values.some((subject) => matchesFilter(subject, pattern)));
};

export const getHmrTransformTarget = (
  target: ActiveHmrTarget | false,
  id: string,
  exclude: Array<string | RegExp>,
  context: { nonDom?: boolean; ssr?: boolean } = {},
) => (target && !context.nonDom && !context.ssr && shouldInjectHmr([id], [], exclude) ? target : false);

export const isHmrRuntimeId = (id: string, helperSpecifier = DEFAULT_HELPER) => {
  const clean = cleanId(id);
  return (
    clean === VIRTUAL_RUNTIME_ID ||
    clean === VIRTUAL_RUNTIME_PUBLIC ||
    clean === cleanId(helperSpecifier) ||
    /[\\/]helper[\\/]hmr(?:\.[cm]?[jt]s)?$/.test(clean)
  );
};

export const encodeVirtualEntry = (id: string, publicId = false) =>
  `${publicId ? PUBLIC_ENTRY_PREFIX : VIRTUAL_ENTRY_PREFIX}${id}`;

export const decodeVirtualEntry = (id: string) => {
  if (id.startsWith(VIRTUAL_ENTRY_PREFIX)) return id.slice(VIRTUAL_ENTRY_PREFIX.length);
  if (id.startsWith(PUBLIC_ENTRY_PREFIX)) return id.slice(PUBLIC_ENTRY_PREFIX.length);
};

export const createEntryProxyCode = (originalId: string, helperSpecifier: string, hasDefaultExport = false) => {
  const specifier = JSON.stringify(originalId);
  const defaultExport = hasDefaultExport ? `export { default } from ${specifier};\n` : '';
  return `import ${JSON.stringify(helperSpecifier)};
export * from ${specifier};
${defaultExport}`;
};

export const createRuntimeModuleCode = (helperSpecifier: string) => `import ${JSON.stringify(helperSpecifier)};\n`;

type RollupLikeResolvedId = { id: string; external?: boolean | 'absolute' };

interface RollupLikePluginContext {
  resolve(
    source: string,
    importer?: string,
    options?: { isEntry?: boolean; skipSelf?: boolean },
  ): Promise<RollupLikeResolvedId | null>;
  load(options: { id: string }): Promise<{ exports: string[] | null }>;
}

export const resolveRollupHmrId = async (context: RollupLikePluginContext, id: string) => {
  if (HMR_RUNTIME_ID_PATTERN.test(id)) return VIRTUAL_RUNTIME_ID;

  const original = decodeVirtualEntry(id);
  if (!original) return;

  const resolved = await context.resolve(original, undefined, { isEntry: true, skipSelf: true });
  if (!resolved) throw new Error(`[unplugin-gem] Cannot resolve HMR entry "${original}"`);
  if (resolved.external) return resolved;
  return encodeVirtualEntry(resolved.id);
};

export const loadRollupHmrId = async (context: RollupLikePluginContext, id: string, helperSpecifier: string) => {
  if (cleanId(id) === VIRTUAL_RUNTIME_ID) return createRuntimeModuleCode(helperSpecifier);

  const original = decodeVirtualEntry(id);
  if (!original) return;

  const moduleInfo = await context.load({ id: original });
  return createEntryProxyCode(original, helperSpecifier, moduleInfo.exports?.includes('default'));
};

type EntryImport = string | string[];
type EntryDescription = { import?: EntryImport };
type EntryObject = Record<string, EntryImport | EntryDescription>;
type StaticEntryConfig = EntryImport | EntryObject;
type EntryConfig = StaticEntryConfig | (() => StaticEntryConfig | Promise<StaticEntryConfig>);

export interface WebpackLikeCompiler {
  context?: string;
  options: {
    entry?: EntryConfig;
    target?: string | string[] | false;
  };
}

export const isNonDomWebpackTarget = (target: string | string[] | false | undefined) => {
  const targets = Array.isArray(target) ? target : [target];
  return targets.some(
    (value) =>
      typeof value === 'string' &&
      (/^(?:async-)?node(?:\d+(?:\.\d+)*)?$/.test(value) ||
        value === 'webworker' ||
        value === 'electron-main' ||
        value === 'electron-preload'),
  );
};

const toImportArray = (value: EntryImport) => (Array.isArray(value) ? [...value] : [value]);

const prependHelper = (imports: string[], helperPath: string, helperSpecifier: string) => {
  if (imports.includes(helperPath) || imports.includes(helperSpecifier) || imports.includes(VIRTUAL_RUNTIME_ID)) {
    return imports;
  }
  return [helperPath, ...imports];
};

const prependToEntryObject = (
  entries: EntryObject,
  helperPath: string,
  helperSpecifier: string,
  include: Array<string | RegExp>,
  exclude: Array<string | RegExp>,
): EntryObject => {
  const result: EntryObject = { ...entries };

  for (const [name, entry] of Object.entries(result)) {
    if (typeof entry === 'string' || Array.isArray(entry)) {
      const imports = toImportArray(entry);
      if (!shouldInjectHmr([name, ...imports], include, exclude)) continue;
      result[name] = prependHelper(imports, helperPath, helperSpecifier);
      continue;
    }

    if (!entry || typeof entry !== 'object' || entry.import === undefined) continue;

    const imports = toImportArray(entry.import);
    if (!shouldInjectHmr([name, ...imports], include, exclude)) continue;
    result[name] = { ...entry, import: prependHelper(imports, helperPath, helperSpecifier) };
  }

  return result;
};

const prependToStaticWebpackEntry = (
  entry: StaticEntryConfig,
  helperPath: string,
  helperSpecifier: string,
  include: Array<string | RegExp>,
  exclude: Array<string | RegExp>,
): StaticEntryConfig => {
  if (typeof entry === 'string' || Array.isArray(entry)) {
    const imports = toImportArray(entry);
    if (!shouldInjectHmr(['main', ...imports], include, exclude)) return entry;
    return prependHelper(imports, helperPath, helperSpecifier);
  }

  if (entry && typeof entry === 'object') {
    return prependToEntryObject(entry, helperPath, helperSpecifier, include, exclude);
  }

  return entry;
};

export const prependToWebpackEntry = (
  entry: EntryConfig,
  helperPath: string,
  helperSpecifier: string,
  include: Array<string | RegExp>,
  exclude: Array<string | RegExp>,
): EntryConfig => {
  if (typeof entry !== 'function') {
    return prependToStaticWebpackEntry(entry, helperPath, helperSpecifier, include, exclude);
  }

  return async () => {
    const resolved = await entry();
    return prependToStaticWebpackEntry(resolved, helperPath, helperSpecifier, include, exclude);
  };
};

export const resolveHelperFromContext = (context: string | undefined, helper: string) => {
  try {
    const require = createRequire(path.join(context ?? process.cwd(), 'package.json'));
    return require.resolve(helper);
  } catch {
    console.warn(`[unplugin-gem] Cannot resolve HMR helper "${helper}", skip injecting it`);
  }
};

export const getHmrFilters = (options: UnpluginGemOptions = {}) => {
  const hmrOptions = resolveHmrOptions(options) ?? {};
  return {
    helper: hmrOptions.helper || DEFAULT_HELPER,
    include: toArray(hmrOptions.include),
    exclude: toArray(hmrOptions.exclude ?? DEFAULT_EXCLUDE),
  };
};

/**
 * 把 HMR runtime 前置到入口 import 列表，保证在元素类定义之前执行。
 * 只处理 webpack/rspack 风格的 entry。
 */
export function prependGemHmrEntry(compiler: WebpackLikeCompiler, options: UnpluginGemOptions = {}) {
  const hmrOptions = resolveHmrOptions(options);
  if (!hmrOptions || hmrOptions.target === 'none' || isNonDomWebpackTarget(compiler.options.target)) return;

  const { helper: helperSpecifier, include, exclude } = getHmrFilters(options);
  const helperPath = resolveHelperFromContext(compiler.context, helperSpecifier);
  if (!helperPath || compiler.options.entry === undefined) return;

  compiler.options.entry = prependToWebpackEntry(compiler.options.entry, helperPath, helperSpecifier, include, exclude);
}

type RollupLikeInput = string | string[] | Record<string, string> | undefined;

export const wrapRollupInput = (
  input: RollupLikeInput,
  include: Array<string | RegExp>,
  exclude: Array<string | RegExp>,
): RollupLikeInput => {
  if (!input) return input;
  if (typeof input === 'string') {
    return shouldInjectHmr(['main', input], include, exclude) ? encodeVirtualEntry(input) : input;
  }
  if (Array.isArray(input)) {
    return input.map((id, index) =>
      shouldInjectHmr([String(index), id], include, exclude) ? encodeVirtualEntry(id) : id,
    );
  }
  return Object.fromEntries(
    Object.entries(input).map(([name, id]) => [
      name,
      shouldInjectHmr([name, id], include, exclude) ? encodeVirtualEntry(id) : id,
    ]),
  );
};

type EsbuildEntryObject = { in: string; out: string };
type EsbuildEntryPoints = string[] | Record<string, string> | EsbuildEntryObject[] | undefined;

const isStringEntryPoints = (entryPoints: string[] | EsbuildEntryObject[]): entryPoints is string[] =>
  entryPoints.every((entry) => typeof entry === 'string');

export const createEsbuildHmrPlan = (
  entryPoints: EsbuildEntryPoints,
  include: Array<string | RegExp>,
  exclude: Array<string | RegExp>,
) => {
  let selectedCount = 0;
  let totalCount = 0;
  const wrap = (id: string, subjects: string[]) => {
    totalCount += 1;
    if (!shouldInjectHmr(subjects, include, exclude)) return id;
    selectedCount += 1;
    return encodeVirtualEntry(id, true);
  };

  let result: EsbuildEntryPoints;
  if (!entryPoints) {
    result = entryPoints;
  } else if (Array.isArray(entryPoints)) {
    if (isStringEntryPoints(entryPoints)) {
      result = entryPoints.map((entry, index) => wrap(entry, [String(index), entry]));
    } else {
      result = entryPoints.map((entry) => ({
        ...entry,
        in: wrap(entry.in, [entry.out, entry.in]),
      }));
    }
  } else {
    result = Object.fromEntries(Object.entries(entryPoints).map(([name, id]) => [name, wrap(id, [name, id])]));
  }

  let strategy: 'skip' | 'inject' | 'proxy' = 'skip';
  if (selectedCount === totalCount && selectedCount > 0) strategy = 'inject';
  else if (selectedCount > 0) strategy = 'proxy';

  return { entryPoints: strategy === 'proxy' ? result : entryPoints, strategy };
};

export const injectEsbuildHelper = (
  inject: string[] | undefined,
  helperPath: string,
  helperSpecifier = DEFAULT_HELPER,
) => {
  if (inject?.some((id) => id === helperPath || id === helperSpecifier || id === VIRTUAL_RUNTIME_ID)) {
    return inject;
  }
  return [helperPath, ...(inject ?? [])];
};
