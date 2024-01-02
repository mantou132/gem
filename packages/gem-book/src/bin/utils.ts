import path from 'path';
import { readFileSync, existsSync, statSync, readdirSync, lstatSync } from 'fs';
import util from 'util';
import { URL } from 'url';
import { createHash } from 'crypto';

import gitRemoteOriginUrl from 'git-remote-origin-url';
import parseGithub from 'parse-github-url';
import { JSDOM } from 'jsdom';
import { marked } from 'marked';
import fm from 'front-matter';
import YAML from 'yaml';
import { startCase } from 'lodash';
import Jimp from 'jimp';

import { FrontMatter } from '../common/frontmatter';
import { isIndexFile, parseFilename, CUSTOM_HEADING_REG } from '../common/utils';

export async function getGithubUrl() {
  const repoDir = process.cwd();
  try {
    const repoPkg = require(path.resolve(repoDir, './package.json'));
    const repo = repoPkg?.repository;
    const git = typeof repo === 'string' ? repo : repo?.url || (await gitRemoteOriginUrl(repoDir));
    const parsed = parseGithub(git);
    if (parsed?.repository) {
      return `https://github.com/${parsed.repository}`;
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
    return startCase(path.basename(process.cwd()));
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
      return;
    }
  } catch {}
  for (const ext of ['', '.js', '.ts']) {
    try {
      return require.resolve(path.resolve(process.cwd(), `${p}${ext}`));
    } catch {}
  }
}

export function resolveModule(p?: string, builtInDirs: string[] = []) {
  if (!p) return;

  return [...builtInDirs.map((dir) => path.resolve(__dirname, `${dir}${p}`)), path.resolve(process.cwd(), p)]
    .map((p) => ['', '.js', '.json', '.mjs'].map((ext) => p + ext))
    .flat()
    .find((e) => existsSync(e));
}

// Prefer built-in
export function resolveTheme(p: string) {
  return resolveModule(p, ['../themes/']);
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
    // eslint-disable-next-line no-console
    console.error(err);
  }
}

export function checkRelativeLink(fullPath: string, docsRootDir: string) {
  const md = readFileSync(fullPath, 'utf8');
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
      // eslint-disable-next-line no-console
      console.warn(`\x1b[33m[${new Date().toISOString()}]: ${fullPath}${position} link warn: ${link}'\x1b[0m`);
    }
  });
}

export function readDirConfig(fullPath: string) {
  const files = readdirSync(fullPath);
  const configFile = files.find(isDirConfigFile);
  if (configFile) {
    return YAML.parse(readFileSync(path.join(fullPath, configFile), 'utf-8')) as FrontMatter;
  }
}

export function getHash(fullPath: string) {
  const hash = createHash('sha256');
  const fileData = readFileSync(fullPath);
  hash.update(fileData);
  return hash.digest('hex').substring(0, 8);
}

export function getFile(fullPath: string, displayRank: boolean | undefined) {
  const content = fullPath ? readFileSync(fullPath, 'utf-8') : '';
  return {
    content,
    metadataChanged: isMdFile(fullPath)
      ? JSON.stringify(metadataRecord[fullPath]) !== JSON.stringify(getMetadata(fullPath, displayRank))
      : false,
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
  const parseMd = (fullPath: string) => {
    const md = readFileSync(fullPath, 'utf8');
    const { attributes, body } = fm<FrontMatter>(md);
    const html = marked(body);
    const { window } = new JSDOM(html);
    const h1 = window.document.querySelector('h1');
    return {
      ...(attributes as FrontMatter),
      title: (attributes.title || h1?.textContent || getTitle()).match(CUSTOM_HEADING_REG)![1],
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

export function isSomeContent(filePath: string, content: string) {
  return existsSync(filePath) && content === readFileSync(filePath, 'utf-8');
}

export function inspectObject(obj: any, depth = 0) {
  // eslint-disable-next-line no-console
  console.log(util.inspect(obj, { colors: true, depth: depth || null }));
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
    // eslint-disable-next-line no-console
    console.error(err);
    return '';
  }
}
