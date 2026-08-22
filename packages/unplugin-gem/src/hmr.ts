import { createRequire } from 'node:module';
import path from 'node:path';

import type { HmrOptions, HmrTarget, UnpluginGemOptions } from './types';

export const DEFAULT_HELPER = '@mantou/gem/helper/hmr';
export const VIRTUAL_ENTRY_PREFIX = '\0unplugin-gem-hmr-entry:';
export const PUBLIC_ENTRY_PREFIX = 'unplugin-gem-hmr-entry:';
export const VIRTUAL_RUNTIME_ID = '\0unplugin-gem-hmr-runtime';
export const VIRTUAL_RUNTIME_PUBLIC = 'virtual:unplugin-gem/hmr';

/** Helper 顶层访问 `window`，默认跳过非 DOM 入口 */
export const DEFAULT_EXCLUDE = [
  /service[-_]?worker/i,
  /(^|[\\/])background([\\/]|$)/i,
  /content[-_]?scripts?[\\/]/i,
  /(^|[\\/])ssr([\\/]|$)/i,
];

export const toArray = <T>(value: T | T[] | undefined) =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];

export const cleanId = (id: string) => id.split('?')[0] ?? id;

export const matches = (id: string, pattern: string | RegExp) => {
  if (typeof pattern === 'string') return id.includes(pattern);
  pattern.lastIndex = 0;
  return pattern.test(id);
};

export const resolveHmrOptions = (options: UnpluginGemOptions = {}): HmrOptions | undefined => {
  if (!options.hmr) return;
  return typeof options.hmr === 'object' ? options.hmr : {};
};

export const getDefaultHmrTarget = (framework: string): HmrTarget => {
  if (framework === 'webpack' || framework === 'rspack') return 'webpack-hot';
  return 'import-meta-hot';
};

export const getHmrTarget = (options: UnpluginGemOptions = {}, framework: string): HmrTarget | false => {
  const hmrOptions = resolveHmrOptions(options);
  if (!hmrOptions) return false;
  return hmrOptions.target ?? getDefaultHmrTarget(framework);
};

export const shouldInjectHmr = (
  subjects: Array<string | undefined>,
  include: Array<string | RegExp>,
  exclude: Array<string | RegExp>,
) => {
  const values = subjects.filter((value): value is string => Boolean(value));
  if (include.length && !include.some((pattern) => values.some((subject) => matches(subject, pattern)))) {
    return false;
  }
  return !exclude.some((pattern) => values.some((subject) => matches(subject, pattern)));
};

export const isHmrRuntimeId = (id: string, helperSpecifier = DEFAULT_HELPER) => {
  const clean = cleanId(id);
  return (
    clean === VIRTUAL_RUNTIME_ID ||
    clean === VIRTUAL_RUNTIME_PUBLIC ||
    clean === helperSpecifier ||
    clean.endsWith('/helper/hmr') ||
    clean.endsWith('/helper/hmr.js') ||
    clean.endsWith('/helper/hmr.ts')
  );
};

export const encodeVirtualEntry = (id: string, publicId = false) =>
  `${publicId ? PUBLIC_ENTRY_PREFIX : VIRTUAL_ENTRY_PREFIX}${id}`;

export const decodeVirtualEntry = (id: string) => {
  if (id.startsWith(VIRTUAL_ENTRY_PREFIX)) return id.slice(VIRTUAL_ENTRY_PREFIX.length);
  if (id.startsWith(PUBLIC_ENTRY_PREFIX)) return id.slice(PUBLIC_ENTRY_PREFIX.length);
};

export const createEntryProxyCode = (originalId: string, helperSpecifier: string) => {
  const specifier = JSON.stringify(originalId);
  return `import ${JSON.stringify(helperSpecifier)};
export * from ${specifier};
export { default } from ${specifier};
`;
};

export const createRuntimeModuleCode = (helperSpecifier: string) => `import ${JSON.stringify(helperSpecifier)};\n`;

type EntryImport = string | string[];
type EntryDescription = { import?: EntryImport; [key: string]: unknown };
type EntryItem = EntryImport | EntryDescription;
type EntryObject = Record<string, EntryItem>;
type EntryConfig = EntryItem | EntryObject | (() => EntryConfig | Promise<EntryConfig>);

export interface WebpackLikeCompiler {
  context?: string;
  options: {
    entry?: EntryConfig;
  };
}

const isEntryDescription = (entry: object): entry is EntryDescription =>
  'import' in entry || 'dependOn' in entry || 'filename' in entry || 'layer' in entry;

const looksLikeNamedEntries = (entry: object): entry is EntryObject =>
  !Array.isArray(entry) && !isEntryDescription(entry);

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

export const prependToWebpackEntry = (
  entry: EntryConfig,
  helperPath: string,
  helperSpecifier: string,
  include: Array<string | RegExp>,
  exclude: Array<string | RegExp>,
): EntryConfig => {
  if (typeof entry === 'function') {
    return async () => {
      const resolved = await entry();
      return prependToWebpackEntry(resolved, helperPath, helperSpecifier, include, exclude) as Exclude<
        EntryConfig,
        () => EntryConfig | Promise<EntryConfig>
      >;
    };
  }

  if (typeof entry === 'string' || Array.isArray(entry)) {
    const imports = toImportArray(entry);
    if (!shouldInjectHmr(['main', ...imports], include, exclude)) return entry;
    return prependHelper(imports, helperPath, helperSpecifier);
  }

  if (entry && typeof entry === 'object') {
    if (isEntryDescription(entry)) {
      if (entry.import === undefined) return entry;
      const imports = toImportArray(entry.import);
      if (!shouldInjectHmr(['main', ...imports], include, exclude)) return entry;
      return { ...entry, import: prependHelper(imports, helperPath, helperSpecifier) };
    }
    if (looksLikeNamedEntries(entry)) {
      return prependToEntryObject(entry, helperPath, helperSpecifier, include, exclude);
    }
  }

  return entry;
};

export const resolveHelperFromContext = (context: string | undefined, helper: string) => {
  try {
    const require = createRequire(path.join(context || process.cwd(), 'package.json'));
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
  if (!options.hmr) return;

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

export const wrapEsbuildEntryPoints = (
  entryPoints: EsbuildEntryPoints,
  include: Array<string | RegExp>,
  exclude: Array<string | RegExp>,
): EsbuildEntryPoints => {
  if (!entryPoints) return entryPoints;
  if (Array.isArray(entryPoints)) {
    if (entryPoints.every((entry): entry is string => typeof entry === 'string')) {
      return entryPoints.map((entry, index) =>
        shouldInjectHmr([String(index), entry], include, exclude) ? encodeVirtualEntry(entry, true) : entry,
      );
    }
    return (entryPoints as EsbuildEntryObject[]).map((entry) =>
      shouldInjectHmr([entry.out, entry.in], include, exclude)
        ? { ...entry, in: encodeVirtualEntry(entry.in, true) }
        : entry,
    );
  }
  return Object.fromEntries(
    Object.entries(entryPoints).map(([name, id]) => [
      name,
      shouldInjectHmr([name, id], include, exclude) ? encodeVirtualEntry(id, true) : id,
    ]),
  );
};

export const injectEsbuildHelper = (inject: string[] | undefined, helperPath: string) => {
  if (inject?.includes(helperPath) || inject?.includes(DEFAULT_HELPER) || inject?.includes(VIRTUAL_RUNTIME_ID)) {
    return inject;
  }
  return [helperPath, ...(inject ?? [])];
};
