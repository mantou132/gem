import { execFileSync } from 'node:child_process';
import path from 'node:path';

import { isGitLab } from './site';
import { getUserLink } from './utils';

/** 项目目录，插件中不以 `.` 开头的 `src` 相对于该目录 */
export const PROJECT_DIR = __GEM_BOOK_PROJECT_DIR__;

/** 文档目录，也是静态资源目录 */
export const DOCS_DIR = __GEM_BOOK_DOCS_DIR__;

const { displayRank, github, sourceBranch, i18n, versions } = __GEM_BOOK_CONFIG__;

/** 语言的文档目录，没有开启多语言时是文档目录，旧版本在文档目录的版本目录中，例如 `docs/v1/en` */
export const getLangDir = (lang: string, version = '') => path.join(DOCS_DIR, version, i18n ? lang : '');

export const toPosix = (file: string) => file.replaceAll(path.sep, '/');

const isInside = (dir: string, file: string) => !path.relative(dir, file).startsWith('..');

/**
 * 文档的路径，例如 `/guide/001-sort.md`，旧版本的文档以版本开头，例如 `/v1/guide/001-sort.md`，
 * 页面路径和文档中的相对链接都基于它
 */
export const getRelFile = (lang: string, file: string) => {
  const version = versions.find((v) => isInside(getLangDir(lang, v), file));
  return `/${version ? `${version}/` : ''}${toPosix(path.relative(getLangDir(lang, version), file))}`;
};

/** `getRelFile` 的反向操作 */
export const toDocFile = (lang: string, relFile: string) => {
  const [, first, ...rest] = relFile.split('/');
  return versions.includes(first) ? path.join(getLangDir(lang, first), ...rest) : path.join(getLangDir(lang), relFile);
};

/** 文档中的相对路径对应的文件 */
export const resolveDocFile = (lang: string, relFile: string, src: string) =>
  toDocFile(lang, path.posix.join(path.posix.dirname(relFile), src));

/** `/guide/001-sort.md` => `/guide/sort`，`/guide/README.md` => `/guide` */
export const toPagePath = (relFile: string) => getUserLink(relFile, displayRank).replace(/(.)\/$/, '$1');

/** `*` 匹配名称中的任意字符，`**` 匹配任意层级的目录 */
const globToRegExp = (glob: string) =>
  new RegExp(
    `^${glob
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*\*\/|\*\*|\*|\?/g, (s) => ({ '**/': '(?:.*/)?', '**': '.*', '*': '[^/]*', '?': '[^/]' })[s]!)}$`,
  );

const ignoredList = __GEM_BOOK_IGNORED__.map(globToRegExp);

/**
 * 忽略的文档或目录，`rel` 是在语言目录中的路径，例如 `guide/draft.md`，
 * 没有 `/` 的规则匹配任意目录中的文件名，`node_modules` 和 `.` 开头的总是忽略
 */
export const isIgnored = (rel: string) => {
  const name = path.posix.basename(rel);
  if (name === 'node_modules' || name.startsWith('.')) return true;
  return __GEM_BOOK_IGNORED__.some((glob, index) => ignoredList[index].test(glob.includes('/') ? rel : name));
};

export const isURL = (s: string) => /^(https?:)?\/\//.test(s);

export const escapeHTML = (s: string) =>
  s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

export const capitalize = (s: string) => s.replace(/^\w/, (c) => c.toUpperCase());

/** HTML 中的文本 */
export const toText = (html: string) =>
  html
    .replace(/<[^>]*>/g, '')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&amp;', '&');

export const git = (...args: string[]) => {
  try {
    return execFileSync('git', args, { cwd: DOCS_DIR, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
};

let gitRoot: string | undefined;

/** 文件在 git 仓库中的路径，不在仓库中时为空 */
export function getRepoPath(file: string) {
  gitRoot ??= git('rev-parse', '--show-toplevel');
  return gitRoot && toPosix(path.relative(gitRoot, file));
}

/** GitHub/GitLab 中的链接，`type` 是 `edit`、`commit`、`raw` 等 */
export const getRepoUrl = (type: string, rest: string) => `${github}${isGitLab() ? '/-' : ''}/${type}/${rest}`;

/** 插件的 `src`：网址、相对于当前文档（`.` 开头）或者相对于项目目录 */
export function resolveSrc(src: string, lang: string, relFile: string): { url: string } | { file: string } {
  if (isURL(src)) return { url: src };
  if (src.startsWith('.')) return { file: resolveDocFile(lang, relFile, src) };
  return { file: path.join(PROJECT_DIR, applyImportMap(src)) };
}

/** 配置的 `importMap` 替换路径的前缀，例如把包名映射到源码目录 */
export function applyImportMap(src: string) {
  const prefix = Object.keys(__GEM_BOOK_IMPORT_MAP__).find((key) => src.startsWith(key));
  return prefix ? __GEM_BOOK_IMPORT_MAP__[prefix] + src.slice(prefix.length) : src;
}

/**
 * 本地文件在网页中的地址：文档目录中的文件是静态资源，其他文件使用仓库中的地址
 */
export function getFileUrl(file: string) {
  const rel = path.relative(DOCS_DIR, file);
  if (!rel.startsWith('..')) return `/${toPosix(rel)}`;
  const repoPath = github && getRepoPath(file);
  if (!repoPath) return '';
  return isGitLab()
    ? getRepoUrl('raw', `${sourceBranch}/${repoPath}`)
    : `https://raw.githubusercontent.com${new URL(github!).pathname}/${sourceBranch}/${repoPath}`;
}
