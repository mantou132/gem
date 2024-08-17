import path from 'path';
import { readFileSync, existsSync, statSync, readdirSync, lstatSync } from 'fs';
import util from 'util';
import { URL } from 'url';
import { createHash } from 'crypto';

import gitRemoteOriginUrl from 'git-remote-origin-url';
import parseGithub from 'parse-github-url';
import { load } from 'cheerio';
import { marked } from 'marked';
import fm from 'front-matter';
import YAML from 'yaml';
import Jimp from 'jimp';
import chalk from 'chalk';

import { FrontMatter } from '../common/frontmatter';
import { isIndexFile, parseFilename, parseTitle } from '../common/utils';

export async function getGithubUrl() {
  const repoDir = process.cwd();
  try {
    const repoPkg = require(path.resolve(repoDir, './package.json'));
    const repo = repoPkg?.repository;
    const git = typeof repo === 'string' ? repo : repo?.url || (await gitRemoteOriginUrl(repoDir));
    const parsed = parseGithub(git);
    if (parsed?.repository) {
      return `https://${parsed.host}/${parsed.repository}`;
    }
  } catch {}
}

export async function getBaseDir() {
  const repoDir = process.cwd();
  try {
    const repoPkg = require(path.resolve(repoDir, './package.json'));
    const repo = repoPkg?.repository;
    return repo?.directory;
  } catch {}
}

export function getRepoTitle() {
  const repoDir = process.cwd();
  try {
    const repoPkg = require(path.resolve(repoDir, './package.json'));
    if (!repoPkg.title) throw 'no title';
    return repoPkg.title;
  } catch {
    return path.basename(process.cwd()).replace(/^./, ($1) => $1.toUpperCase());
  }
}

// dir2 is in dir
export function inTheDir(dir: string, dir2: string) {
  return !path.relative(dir, dir2).startsWith('.');
}

// Prefer built-in
export function resolveLocalPlugin(p: string) {
  try {
    const pluginDir = path.resolve(__dirname, `../plugins`);
    const plugin = require.resolve(path.resolve(pluginDir, p));
    if (inTheDir(pluginDir, plugin) && !lstatSync(plugin).isSymbolicLink()) {
      return { builtIn: plugin };
    }
  } catch {}
  for (const ext of ['', '.js', '.ts']) {
    try {
      return { custom: require.resolve(path.resolve(process.cwd(), `${p}${ext}`)) };
    } catch {}
  }

  if (p) print(chalk.red(`Plugin not found:`), p);
}

export function resolveModule(
  pathname?: string,
  { builtInDirs = [], silent = false }: { builtInDirs?: string[]; silent?: boolean } = {},
) {
  if (!pathname) return;

  const modulePath = [
    ...builtInDirs.map((dir) => path.resolve(__dirname, `${dir}${pathname}`)),
    path.resolve(process.cwd(), pathname),
  ]
    .map((p) => ['', '.js', '.json', '.mjs'].map((ext) => p + ext))
    .flat()
    .find((e) => existsSync(e));

  if (!silent && !modulePath) print(chalk.red(`Module not found:`), pathname);

  return modulePath;
}

// Prefer built-in
export function resolveTheme(p: string) {
  return resolveModule(p, { builtInDirs: ['../themes/'] });
}

export async function importObject<T>(fullPath?: string) {
  if (!fullPath) return;
  try {
    if (fullPath.endsWith('.mjs')) {
      return (await import(`${fullPath}?v=${performance.now()}`)).default;
    }
    delete require.cache[fullPath];
    return require(fullPath) as T;
  } catch (err) {
    print(err);
  }
}

export function checkRelativeLink(fullPath: string, docsRootDir: string) {
  const md = getMdFile(fullPath).content;
  const lines = md.split('\n');
  // 获取所有链接
  const results = [...md.matchAll(/\[.*?\]\((.*?)(\s+.*?)?\)/g)];
  // 提取相对目录
  const links = results.map(([, link], index) => ({ link, index })).filter(({ link }) => /^\.?\.?\/[^/]/.test(link));
  links.forEach(({ link, index }) => {
    const linkWithoutHash = link.replace(/#.*/, '');
    const targetPath = link.startsWith('/')
      ? path.join(docsRootDir, linkWithoutHash)
      : path.resolve(path.dirname(fullPath), linkWithoutHash);
    if (!existsSync(targetPath)) {
      const strIndex = results[index].index || 0;
      let currentNum = 0;
      let lineNum = 1;
      let colNum = 1;
      for (const line of lines) {
        if (strIndex > currentNum + line.length) {
          lineNum += 1;
        } else {
          colNum = strIndex - currentNum + 1;
          break;
        }
        currentNum += line.length + 1;
      }
      const position = `(${lineNum},${colNum})`;
      print(chalk.yellow(`[${new Date().toISOString()}]: ${fullPath}${position} link warn: ${link}`));
    }
  });
}

export function readDirConfig(fullPath: string) {
  const files = readdirSync(fullPath);
  const configFile = files.find(isDirConfigFile);
  if (configFile) {
    const configPath = path.join(fullPath, configFile);
    try {
      return YAML.parse(readFileSync(configPath, 'utf-8')) as FrontMatter;
    } catch (error) {
      print(chalk.red(`Parse error: ${configPath}`));
    }
  }
}

const mdFileRecord = new Map<string, { buffer: Buffer; content: string; hash: string }>();

export function getMdFile(fullPath: string) {
  let res = mdFileRecord.get(fullPath);
  if (!res) {
    const hash = createHash('sha256');
    const buffer = readFileSync(fullPath);
    hash.update(buffer);
    res = {
      buffer,
      content: buffer.toString(),
      hash: hash.digest('hex').substring(0, 8),
    };
    mdFileRecord.set(fullPath, res);
  }
  return res;
}

export function getLatestMdFile(fullPath: string, displayRank: boolean | undefined) {
  mdFileRecord.delete(fullPath);
  const oldMetadata = metadataRecord[fullPath];
  const newMetadata = getMetadata(fullPath, displayRank);
  return {
    content: getMdFile(fullPath).content,
    metadataChanged: JSON.stringify(oldMetadata) !== JSON.stringify(newMetadata),
  };
}

const metadataRecord: Record<string, FrontMatter> = {};

export function getMetadata(fullPath: string, displayRank: boolean | undefined) {
  const getTitle = () => {
    const basename = path.basename(fullPath);
    if (isIndexFile(basename)) return '';
    const filename = basename.replace(/\.[^.]*$/, '');
    return displayRank ? filename : parseFilename(filename).title;
  };
  const parseMd = (p: string) => {
    const md = getMdFile(p).content;
    let attributes: FrontMatter = {};
    let body = '';
    try {
      const fmd = fm<FrontMatter>(md);
      attributes = fmd.attributes;
      body = fmd.body;
    } catch {
      print(chalk.red(`Parse frontmatter error: ${p}`));
    }
    return {
      ...(attributes as FrontMatter),
      title: parseTitle(attributes.title || load(marked(body))('h1').text() || getTitle()).text,
    };
  };

  let metadata: (FrontMatter & { title: string }) | undefined;
  if (statSync(fullPath).isDirectory()) {
    metadata = {
      title: getTitle(),
      ...readDirConfig(fullPath),
    };
  } else if (isMdFile(fullPath)) {
    metadata = parseMd(fullPath);
  } else {
    metadata = { title: '' };
  }

  metadataRecord[fullPath] = metadata;
  return metadata;
}

export function isMdFile(filename: string) {
  return /\.md$/i.test(path.extname(filename));
}

export function isDirConfigFile(filename: string) {
  return /config\.ya?ml$/i.test(path.basename(filename));
}

export function isURL(s: string) {
  try {
    return !!new URL(s);
  } catch {
    return false;
  }
}

export function print(...args: any) {
  for (const obj of args) {
    // eslint-disable-next-line no-console
    console.log(
      typeof obj === 'string'
        ? obj
        : (obj instanceof Error ? chalk.red(`ERROR\n`) : '') +
            util.inspect(obj, { colors: true, maxStringLength: 100, depth: 2 }),
    );
  }
}

export async function getIconDataUrl(filePath: string) {
  if (isURL(filePath)) return filePath;
  if (filePath.startsWith('data:')) return filePath;
  if (filePath.endsWith('.svg')) {
    return `data:image/svg+xml;base64,${btoa(readFileSync(path.resolve(process.cwd(), filePath), 'utf-8'))}`;
  }
  try {
    const image = await Jimp.read(filePath);
    return await image.clone().resize(Jimp.AUTO, 100).getBase64Async(Jimp.MIME_PNG);
  } catch (err) {
    print(err);
    return '';
  }
}

export function isGithubOrGitLabNav(title?: string) {
  if (title && ['github', 'gitlab'].includes(title.toLowerCase())) {
    return true;
  }
}
