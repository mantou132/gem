import fs from 'node:fs';
import path from 'node:path';

import fm from 'front-matter';
import { marked } from 'marked';
import YAML from 'yaml';

import { defaultLanguage, languages, localizePath } from '$gemkit/i18n';
import {
  capitalize,
  getLangDir,
  getRelFile,
  getRepoPath,
  getRepoUrl,
  git,
  isIgnored,
  isURL,
  toDocFile,
  toPagePath,
  toPosix,
  toText,
} from './common.server';
import type { FrontMatter } from './frontmatter';
// https://developers.google.com/search/docs/advanced/crawling/localized-versions#language-codes
import langNames from './lang.json';
import {
  type MarkdownContext,
  renderInline,
  renderLlmMarkdown,
  renderMarkdown,
  toAssetUrl,
  toMarkdownUrl,
} from './markdown.server';
import { flatLinks, getSidebar, getVersion, isGitLab, isHomePage } from './site';
import { isUntranslated, translate } from './translate.server';
import type { Content, Doc, ExternalLink, Home, LinkItem, SearchItem, Section, SidebarItem, Site } from './types';
import { isIndexFile, normalizeId, parseFilename, parseTitle } from './utils';

const { github, sourceBranch, versions } = __GEM_BOOK_CONFIG__;

const readDirConfig = (dir: string): FrontMatter => {
  const file = path.join(dir, 'config.yml');
  return fs.existsSync(file) ? YAML.parse(fs.readFileSync(file, 'utf8')) || {} : {};
};

const readMd = (file: string) => fm<FrontMatter>(fs.readFileSync(file, 'utf8'));

/**
 * 文档的内容，只有标题的文档使用默认语言中同一路径的文档翻译
 */
async function getBody(lang: string, file: string, body: string) {
  if (lang === defaultLanguage || !isUntranslated(body)) return body;
  const source = toDocFile(defaultLanguage, getRelFile(lang, file));
  if (!fs.existsSync(source)) return body;
  return translate(readMd(source).body, defaultLanguage, lang);
}

const getTitle = (file: string) => {
  const { attributes, body } = readMd(file);
  const heading = body.match(/^#\s+(.*)$/m)?.[1];
  const title =
    attributes.title ||
    attributes.hero?.title ||
    (heading && parseTitle(heading).text) ||
    parseFilename(path.basename(file, '.md')).title;
  // 标题中可能有 Markdown，例如 `` `<dy-button>` ``
  return capitalize(toText(renderInline(title)));
};

type Entry = { name: string; isDir: boolean };

// index 优先，都有编号时按编号，其次目录优先，有编号的优先，`reverse` 时除了 index 都反过来
function compareEntry(a: Entry, b: Entry, reverse = false) {
  if (isIndexFile(a.name)) return -1;
  if (isIndexFile(b.name)) return 1;
  const order = reverse ? -1 : 1;
  const [ra, rb] = [parseFilename(a.name).rank, parseFilename(b.name).rank];
  if (ra && rb) return (parseInt(ra, 10) - parseInt(rb, 10)) * order;
  if (a.isDir !== b.isDir) return (a.isDir ? -1 : 1) * order;
  if (!!ra !== !!rb) return (ra ? -1 : 1) * order;
  return a.name.localeCompare(b.name) * order;
}

interface LangContent {
  sidebar: SidebarItem[];
  sections: Section[];
  nav: LinkItem[];
  /** key 是页面路径 */
  files: Map<string, string>;
  /** frontmatter 中 `redirect` 的页面，key 是页面路径，值是跳转的页面路径 */
  redirects: Map<string, string>;
}

/** 扫描语言目录，`version` 是旧版本，开发时每次都重新扫描，文档增删后刷新即可 */
function scanLang(lang: string, version = ''): LangContent {
  const root = getLangDir(lang, version);
  const files = new Map<string, string>();
  const redirects = new Map<string, string>();
  const sections: Section[] = [];
  const nav: (LinkItem & { order: number })[] = [];

  /** 目录中的文件，`config.yml` 的 `groups` 将文件分组显示，没有分组的文件在后面 */
  const scan = (dir: string): SidebarItem[] => {
    const config = readDirConfig(dir);
    const names = fs.readdirSync(dir);
    if (!config.groups) return scanNames(dir, names, config);
    const rest = new Set(names);
    const grouped = config.groups.flatMap(({ title, members = [] }): SidebarItem[] => {
      members.forEach((member) => rest.delete(member));
      const children = scanNames(
        dir,
        members.filter((member) => fs.existsSync(path.join(dir, member))),
        config,
      );
      // 没有标题的分组直接显示
      if (!title) return children;
      return children.length ? [{ title, children }] : [];
    });
    return [...grouped, ...scanNames(dir, [...rest], config)];
  };

  const scanNames = (dir: string, names: string[], { reverse }: FrontMatter): SidebarItem[] =>
    names
      .filter((name) => !isIgnored(toPosix(path.relative(root, path.join(dir, name)))))
      .map((name) => ({ name, isDir: fs.statSync(path.join(dir, name)).isDirectory() }))
      .filter(({ name, isDir }) => isDir || name.endsWith('.md'))
      .sort((a, b) => compareEntry(a, b, reverse))
      .flatMap((entry): SidebarItem[] => {
        const file = path.join(dir, entry.name);
        const relFile = getRelFile(lang, file);
        // 没有开启多语言时，旧版本的目录在最新版本的目录中
        if (entry.isDir && versions.some((v) => file === getLangDir(lang, v))) return [];
        if (entry.isDir) {
          const { title, sidebarIgnore, isNav, navTitle, navOrder = 100 } = readDirConfig(file);
          const children = scan(file);
          const item = { title: title || capitalize(parseFilename(entry.name).title), children };
          if (sidebarIgnore || !children.length) return [];
          // `isNav` 的目录是独立的一部分文档，只在导航中显示
          if (isNav) {
            sections.push({ link: toPagePath(relFile), items: children });
            const [first] = flatLinks(children);
            if (first) nav.push({ title: navTitle || item.title, link: first.link, order: navOrder });
            return [];
          }
          return [item];
        }
        const { sidebarIgnore, isNav, navTitle, navOrder = 100, redirect } = readMd(file).attributes;
        const link = toPagePath(relFile);
        if (redirect) {
          redirects.set(link, toPagePath(new URL(redirect, `gbp:${relFile}`).pathname));
          return [];
        }
        files.set(link, file);
        const item = { title: getTitle(file), link };
        if (isNav) nav.push({ title: navTitle || item.title, link, order: navOrder });
        // 首页模式中首页不在侧边栏中显示
        return sidebarIgnore || isHomePage(link) ? [] : [item];
      });

  // 旧版本可能没有该语言
  const sidebar = fs.existsSync(root) ? scan(root) : [];
  nav.sort((a, b) => a.order - b.order);
  return { sidebar, sections, nav: nav.map(({ title, link }) => ({ title, link })), files, redirects };
}

const ICON_LINKS = ['github', 'gitlab', 'twitter', 'discord'];

/** 版本的导航和侧边栏，导航包括配置的站内链接 */
function getContent(lang: string, version = ''): Content & { files: LangContent['files'] } {
  const { sidebar, sections, nav, files } = scanLang(lang, version);
  return { sidebar, sections, nav: [...nav, ...__GEM_BOOK_NAV__.filter(({ link }) => !isURL(link))], files };
}

/** 首页，没有时是第一个页面 */
const getHomePath = (files: LangContent['files'], home: string) =>
  files.has(home) ? home : files.keys().next().value || home;

export function getSite(lang: string): Site {
  const { sidebar, sections, nav, files } = getContent(lang);
  const configNav = __GEM_BOOK_NAV__;
  const links: ExternalLink[] = configNav
    .filter(({ link }) => isURL(link))
    .map(({ title, link }) => {
      const icon = title.toLowerCase();
      return ICON_LINKS.includes(icon) ? { title, link, icon } : { title, link };
    });
  if (github)
    links.push({ title: isGitLab() ? 'GitLab' : 'GitHub', link: github, icon: isGitLab() ? 'gitlab' : 'github' });
  return {
    home: getHomePath(files, '/'),
    sidebar,
    sections,
    nav,
    versions: versions.map((name) => {
      const { files, ...content } = getContent(lang, name);
      const link = getHomePath(files, `/${name}`);
      return { name, link, ...content };
    }),
    links,
    langs: __GEM_BOOK_CONFIG__.i18n
      ? languages.map((code) => ({ code, name: langNames[code as keyof typeof langNames] || code }))
      : [],
    footer: renderInline(__GEM_BOOK_FOOTER__),
  };
}

/** 预渲染的页面路径，包括跳转的页面，语言前缀由 gemkit 添加 */
export function getPagePaths(lang: string) {
  return ['', ...versions].flatMap((version) => {
    const { files, redirects } = scanLang(lang, version);
    return [...files.keys(), ...redirects.keys()];
  });
}

export const getRedirect = (lang: string, pagePath: string) =>
  scanLang(lang, getVersion(pagePath)).redirects.get(pagePath);

/** 旧版本的页面在最新版本中对应的页面，没有时是首页 */
function getOldVersion(lang: string, pagePath: string): Doc['oldVersion'] {
  const version = getVersion(pagePath);
  if (!version) return;
  const latest = pagePath.slice(version.length + 1) || '/';
  return { name: version, latest: scanLang(lang).files.has(latest) ? latest : '/' };
}

/** 编辑链接和最后修改时间，读取本地 git 仓库，没有提交的文件没有最后修改时间 */
function getGitInfo(file: string): Pick<Doc, 'editUrl' | 'lastUpdated'> {
  const repoPath = github && getRepoPath(file);
  if (!repoPath) return {};
  const editUrl = getRepoUrl('edit', `${sourceBranch}/${repoPath}`);
  const [date, hash, message] = git('log', '-1', '--format=%cI%x00%H%x00%s', '--', file).split('\0');
  if (!date) return { editUrl };
  return { editUrl, lastUpdated: { date, message, url: getRepoUrl('commit', hash) } };
}

/** 首页的 hero 和 features，描述是 Markdown */
function getHome({ hero, features }: FrontMatter, ctx: MarkdownContext): Home {
  return {
    hero: hero && {
      ...hero,
      desc: renderInline(hero.desc),
      actions: hero.actions?.map(({ text, link }) => ({
        title: text,
        link: link.startsWith('.') ? toPagePath(new URL(link, `gbp:${ctx.relFile}`).pathname) : link,
      })),
    },
    features: features?.map(({ icon, title, desc }) => ({
      // 少于 3 个字符的图标是 emoji
      icon: icon && [...icon].length > 3 ? toAssetUrl(icon, ctx) : icon,
      title,
      desc: renderInline(desc),
    })),
  };
}

/** 页面对应的文档文件 */
export const getDocFile = (lang: string, pagePath: string) => scanLang(lang, getVersion(pagePath)).files.get(pagePath);

/** 第一段文本，最多 160 个字符 */
function getExcerpt(html: string) {
  const text = toText(html.match(/<p>([\s\S]*?)<\/p>/)?.[1] || '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > 160 ? `${text.slice(0, 159)}…` : text;
}

export async function getDoc(lang: string, pagePath: string): Promise<Doc | undefined> {
  const content = scanLang(lang, getVersion(pagePath));
  const file = content.files.get(pagePath);
  if (!file) return;
  const { attributes, body } = readMd(file);
  const ctx = { lang, relFile: getRelFile(lang, file) };
  const { html, headings } = await renderMarkdown(await getBody(lang, file, body), ctx);
  const links = flatLinks(getSidebar(content, pagePath));
  const index = links.findIndex(({ link }) => link === pagePath);
  return {
    title: getTitle(file),
    html,
    description:
      attributes.description ||
      (attributes.hero?.desc ? toText(renderInline(attributes.hero.desc)) : '') ||
      getExcerpt(html),
    headings,
    home: isHomePage(pagePath) ? getHome(attributes, ctx) : undefined,
    ...getGitInfo(file),
    prev: index > 0 ? links[index - 1] : undefined,
    next: index >= 0 ? links[index + 1] : undefined,
    oldVersion: getOldVersion(lang, pagePath),
  };
}

/** 每个链接所在的目录的标题 */
function getDirTitles(items: SidebarItem[], parents: string[] = [], result = new Map<string, string[]>()) {
  for (const { title, link, children } of items) {
    if (link) result.set(link, parents);
    if (children) getDirTitles(children, [...parents, title], result);
  }
  return result;
}

/** 本地搜索的索引，页面和二级标题分别是一项，内容是 Markdown 渲染后的文本（不展开插件） */
export function getSearchIndex(lang: string) {
  const { files, sidebar, sections } = scanLang(lang);
  const dirTitles = getDirTitles([...sidebar, ...sections.flatMap(({ items }) => items)]);
  const result: SearchItem[] = [];
  for (const [link, file] of files) {
    const pageTitle = getTitle(file);
    const titles = [...(dirTitles.get(link) || []), pageTitle];
    if (titles.length < 2) titles.unshift(__GEM_BOOK_CONFIG__.title);
    const path = localizePath(lang, link);
    let current: SearchItem = { id: path, titles, content: '', type: `lvl${titles.length - 1}` };
    result.push(current);
    for (const token of marked.lexer(readMd(file).body)) {
      if (token.type === 'heading' && token.depth === 1) continue;
      const text = toText(token.type === 'heading' ? renderInline(token.text) : marked.parser([token]));
      if (token.type === 'heading' && token.depth === 2) {
        const { text: heading, customId } = parseTitle(text);
        current = {
          id: `${path}#${normalizeId(customId || heading)}`,
          titles: [...titles, heading],
          content: '',
          type: 'content',
        };
        result.push(current);
      } else {
        current.content += `${text}\n`;
      }
    }
  }
  return result;
}

/** 侧边栏的链接按顶层目录分组，顶层的链接在最前面 */
function groupLinks(items: SidebarItem[]) {
  const top = items.filter(({ link }) => link) as LinkItem[];
  const groups = items
    .filter(({ children }) => children)
    .map(({ title, children = [] }) => ({ title, links: flatLinks(children) }));
  return top.length ? [{ title: '', links: top }, ...groups] : groups;
}

/**
 * 给 LLM 的文件：`llms.txt` 是所有页面的链接，`llms-full.txt` 是所有页面的内容，
 * 每个页面的 Markdown 展开了插件，key 是地址
 */
export async function getLlms(lang: string) {
  const { files, sidebar, sections } = scanLang(lang);
  const pages: Record<string, string> = {};
  for (const [link, file] of files) {
    const body = await getBody(lang, file, readMd(file).body);
    const content = await renderLlmMarkdown(body, { lang, relFile: getRelFile(lang, file) });
    // 首页模式的首页可能没有一级标题
    pages[toMarkdownUrl(lang, link)] = /^#\s/m.test(content) ? content : `# ${getTitle(file)}\n\n${content}`;
  }
  const lines = [`# ${__GEM_BOOK_CONFIG__.title}`, ''];
  const desc = files.has('/') && readMd(files.get('/')!).attributes.hero?.desc;
  if (desc) lines.push(`> ${toText(renderInline(desc))}`, '');
  for (const { title, links } of groupLinks([...sidebar, ...sections.flatMap(({ items }) => items)])) {
    if (title) lines.push(`## ${title}`, '');
    lines.push(...links.map((item) => `- [${item.title}](${toMarkdownUrl(lang, item.link)})`), '');
  }
  return { index: lines.join('\n'), full: Object.values(pages).join('\n\n'), pages };
}
