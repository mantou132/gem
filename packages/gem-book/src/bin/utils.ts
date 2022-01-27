import path from 'path';
import { readFileSync, existsSync, statSync, readdirSync, lstatSync } from 'fs';
import util from 'util';
import { URL } from 'url';

import gitRemoteOriginUrl from 'git-remote-origin-url';
import parseGithub from 'parse-github-url';
import { JSDOM } from 'jsdom';
import marked from 'marked';
import fm from 'front-matter';
import YAML from 'yaml';
import { startCase } from 'lodash';
import Jimp from 'jimp/es';

import { NavItem } from '../common/config';
import { FrontMatter } from '../common/frontmatter';
import { isIndexFile, parseFilename } from '../common/utils';

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

// Prefer built-in
export function resolveLocalPlugin(p: string) {
  try {
    const pluginDir = path.resolve(__dirname, `../plugins`);
    const plugin = require.resolve(path.resolve(pluginDir, p));
    if (inTheDir(pluginDir, plugin) && !lstatSync(plugin).isSymbolicLink()) {
      return;
    }
  } catch {
    //
  }
  for (const ext of ['', '.js', '.ts']) {
    try {
      return require.resolve(path.resolve(process.cwd(), `${p}${ext}`));
    } catch {
      //
    }
  }
}

// Prefer built-in
export function resolveTheme(p?: string) {
  if (!p) return { resolveThemePath: p, themeObject: null };
  let resolveThemePath = '';
  try {
    resolveThemePath = require.resolve(path.resolve(__dirname, `../themes/${p}`));
  } catch {
    resolveThemePath = require.resolve(path.resolve(process.cwd(), p));
  }
  return { resolveThemePath, themeObject: require(resolveThemePath) };
}

export function checkRelativeLink(fullPath: string, docsRootDir: string) {
  const md = readFileSync(fullPath, 'utf8');
  const lines = md.split('\n');
  const results = [...md.matchAll(/\[.*?\]\((.*?)(\s+.*?)?\)/g)];
  const links = results.map(([, link], index) => ({ link, index })).filter(({ link }) => /^\.?\.?\//.test(link));
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
      console.warn(`${fullPath}${position} link warn: ${link}`);
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

type FileMetadata = FrontMatter & {
  title: string;
  headings?: NavItem[];
};

export function getMetadata(fullPath: string, displayRank: boolean | undefined): FileMetadata {
  const getTitle = () => {
    const basename = path.basename(fullPath);
    if (isIndexFile(basename)) return '';
    const filename = basename.replace(/\.[^.]*$/, '');
    return displayRank ? filename : parseFilename(filename).title;
  };
  const parseMd = (fullPath: string) => {
    const md = readFileSync(fullPath, 'utf8');
    const { attributes, body } = fm<FileMetadata>(md);
    const html = marked(body);
    const { window } = new JSDOM(html);
    const h1 = window.document.querySelector('h1');
    const h2s = window.document.querySelectorAll('h2');
    return {
      ...(attributes as FileMetadata),
      title: attributes.title || h1?.textContent || getTitle(),
      headings: h2s.length
        ? [...h2s].map(
            (heading) =>
              ({
                title: heading.textContent as string,
                link: `#${heading.id}`,
                type: 'heading',
              } as NavItem),
          )
        : undefined,
    };
  };

  if (statSync(fullPath).isDirectory()) {
    return {
      title: getTitle(),
      ...readDirConfig(fullPath),
    };
  } else if (isMdfile(fullPath)) {
    return parseMd(fullPath);
  }
  return { title: '' };
}

export function isMdfile(filename: string) {
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

// dir2 is in dir
export function inTheDir(dir: string, dir2: string) {
  return !path.relative(dir, dir2).startsWith('.');
}

export function isSomeContent(filePath: string, content: string) {
  return existsSync(filePath) && content === readFileSync(filePath, 'utf-8');
}

export function inspectObject(obj: any) {
  console.log(util.inspect(obj, { colors: true, depth: null }));
}

export async function getIconDataUrl(path: string) {
  try {
    const image = await Jimp.read(path);
    return await image.clone().resize(Jimp.AUTO, 100).getBase64Async(Jimp.MIME_PNG);
  } catch (err) {
    if (isURL(path)) return path;
    throw err;
  }
}
