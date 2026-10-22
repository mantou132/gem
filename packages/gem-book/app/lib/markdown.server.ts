import fs from 'node:fs';
import path from 'node:path';

import fm from 'front-matter';
import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import css from 'highlight.js/lib/languages/css';
import diff from 'highlight.js/lib/languages/diff';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import markdown from 'highlight.js/lib/languages/markdown';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';
import { marked, Renderer, type Token, type Tokens } from 'marked';

import { localizePath } from '$gemkit/i18n';
import { renderApi } from './api.server';
import {
  escapeHTML,
  getFileUrl,
  getRelFile,
  isURL,
  PROJECT_DIR,
  resolveDocFile,
  resolveSrc,
  toPagePath,
  toPosix,
  toText,
} from './common.server';
import { getParts, getRanges } from './ranges';
import type { Heading } from './types';
import { getGlobal, normalizeId, parseTitle } from './utils';

/** 当前渲染的文档，`relFile` 是在语言目录中的路径 */
export interface MarkdownContext {
  lang: string;
  relFile: string;
}

// 语言的别名（例如 `ts`、`sh`、`html`、`yml`）由 highlight.js 提供
Object.entries({ bash, css, diff, javascript, json, markdown, typescript, xml, yaml }).forEach(([name, lang]) =>
  hljs.registerLanguage(name, lang),
);

/** 服务端高亮代码，不支持的语言只转义 */
const highlightCode = (code: string, lang: string) =>
  hljs.getLanguage(lang) ? hljs.highlight(code, { language: lang }).value : escapeHTML(code);

/** 省略的行，范围之间显示一行 */
const GAP_LINE = '⋯';

interface CodeOptions {
  lang?: string;
  filename?: string;
  /** `active` 是代码组中默认显示的文件，`hidden` 不在代码组中显示 */
  status?: string;
  /** 高亮的行，格式和 `range` 一样 */
  highlight?: string;
  /** 只显示部分行，同时显示行号，格式见 `getRanges` */
  range?: string;
}

/** 代码块，代码由服务端高亮，行号和高亮行由 `<gem-book-code>` 渲染 */
function renderCode(code: string, { lang = '', filename = '', status = '', highlight = '', range = '' }: CodeOptions) {
  const lines = code.replace(/\r?\n$/, '').split(/\r?\n/);
  const { parts, lineNumbersParts } = getParts(lines, getRanges(range, lines));
  // 显示的每一行的原始行号，省略的行为 0
  const shown = lineNumbersParts.flatMap((numbers, index) => (index ? [0, ...numbers] : numbers));
  const highlights = new Set(
    highlight
      ? getRanges(highlight, lines).flatMap(([start, end]) =>
          Array.from({ length: end - start + 1 }, (_, i) => start + i),
        )
      : [],
  );
  const attrs = {
    lang,
    filename,
    status,
    // 显示的行的序号
    highlight: shown.flatMap((line, index) => (highlights.has(line) ? index + 1 : [])).join(','),
    linenumbers: range ? shown.map((line) => line || '').join(',') : '',
  };
  const content = parts.map((part) => highlightCode(part, lang)).join(`\n<span class="gap">${GAP_LINE}</span>\n`);
  return `<gem-book-code${toAttrs(attrs)}><pre><code>${content}</code></pre></gem-book-code>`;
}

const toAttrs = (attrs: Record<string, string>) =>
  Object.entries(attrs)
    .filter(([, value]) => value)
    .map(([name, value]) => ` ${name}="${escapeHTML(value)}"`)
    .join('');

const parseAttrs = (s: string) =>
  Object.fromEntries([...s.matchAll(/([\w-]+)(?:="([^"]*)")?/g)].map(([, name, value = '']) => [name, value]));

/** 文档中相对路径的资源，例如图片 */
export const toAssetUrl = (src: string, { lang, relFile }: MarkdownContext) =>
  isURL(src) || src.startsWith('/') ? src : getFileUrl(resolveDocFile(lang, relFile, src));

function createRenderer({ lang, relFile }: MarkdownContext, headings: Heading[]) {
  const renderer = new Renderer();

  renderer.heading = (fullText, level) => {
    // # heading {#custom-id}，自定义 ID 中的 Markdown 语法也被渲染了，所以从文本中读取
    const { text: plainText, customId } = parseTitle(toText(fullText));
    const text = fullText.replace(/\s*\{#.*\}\s*$/s, '');
    const id = normalizeId(customId || plainText);
    headings.push({ level, id, text: plainText });
    return `<h${level} id="${id}">${text}<a class="anchor" aria-hidden="true" href="#${id}"></a></h${level}>`;
  };

  // GitHub 的提示语法 `> [!NOTE]`
  renderer.blockquote = (quote) => {
    let type = '';
    const content = quote.replace(/^<p>\[!(.*)\]/, (_, $1) => {
      type = $1;
      return `<p class="title">${$1}</p><p>`;
    });
    return `<blockquote class="${type.toLowerCase()}">${content}</blockquote>`;
  };

  const { table } = renderer;
  renderer.table = (header, body) => `<div class="table-wrap">${table.call(renderer, header, body)}</div>`;

  // ```lang filename status highlight
  renderer.code = (code, infoString = '') => {
    const [codeLang, ...rest] = infoString.split(/\s+/);
    const highlight = rest.length && /^[-\d,]+$/.test(rest.at(-1)!) ? rest.pop() : '';
    const [filename, status] = rest;
    return renderCode(code, { lang: codeLang, filename, status, highlight });
  };

  renderer.image = (href, title, text) =>
    `<img src="${toAssetUrl(href, { lang, relFile })}" alt="${escapeHTML(text)}" title="${escapeHTML(title || '')}" loading="lazy">`;

  renderer.link = (href, title, text) => {
    if (href.startsWith('.')) {
      const { pathname, hash } = new URL(href, `gbp:${relFile}`);
      return `<gem-link class="link" path="${toPagePath(pathname)}" hash="${hash}">${text}</gem-link>`;
    }
    const target = isURL(href) ? ' target="_blank"' : '';
    return `<a class="link" href="${href}" title="${escapeHTML(title || '')}"${target}>${text}</a>`;
  };

  return renderer;
}

const htmlToken = (text: string): Tokens.HTML => ({ type: 'html', block: true, pre: false, raw: text, text });

/** 相对于文档的路径（`.` 开头）转换成相对于项目目录的路径 */
const toProjectPath = (src: string, { lang, relFile }: MarkdownContext) =>
  src.startsWith('.') ? toPosix(path.relative(PROJECT_DIR, resolveDocFile(lang, relFile, src))) : src;

/** 插件的相对路径转换成相对于项目目录的路径，包含的文档中的插件也可以使用 */
function rewriteSrc(tokens: Token[], ctx: MarkdownContext) {
  marked.walkTokens(tokens, (token) => {
    if (token.type !== 'html') return;
    token.text = token.text.replace(
      /(<gbp-[\w-]+\b(?:[^>"]|"[^"]*")*?\ssrc=")([^"]*)"/g,
      (_: string, start: string, src: string) => `${start}${toProjectPath(src, ctx)}"`,
    );
  });
}

/** 包含的文档中的相对链接，转换成相对于当前文档的链接 */
function rebaseLinks(tokens: Token[], from: string, to: string) {
  marked.walkTokens(tokens, (token) => {
    if ((token.type !== 'link' && token.type !== 'image') || !token.href.startsWith('.')) return;
    const { pathname, search, hash } = new URL(token.href, `gbp:${from}`);
    const rel = path.posix.relative(path.posix.dirname(to), pathname);
    token.href = `${rel.startsWith('.') ? rel : `./${rel}`}${search}${hash}`;
  });
}

async function readSrc(src: string) {
  const resolved = resolveSrc(src, '', '/');
  if ('file' in resolved) return { text: fs.readFileSync(resolved.file, 'utf8'), file: resolved.file };
  const res = await fetch(resolved.url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return { text: await res.text() };
}

const selectLines = (text: string, range = '') => {
  if (!range) return text;
  const lines = text.split(/\r?\n/);
  return getParts(lines, getRanges(range, lines)).parts.join('\n');
};

const MEDIA_TYPES = { img: /(a?png|jpe?g|gif|webp|avif|svg)$/, video: /(mp4|webm)$/, audio: /(mp3|ogg|wav)$/ };

/** 服务端渲染的插件，展开成 Markdown 的 token */
const plugins: Record<string, (attrs: Record<string, string>, ctx: MarkdownContext) => Promise<Token[]>> = {
  /** 包含其他 Markdown 文档，标题会出现在目录中 */
  include: async ({ src, range }, ctx) => {
    const { text, file } = await readSrc(src);
    const relFile = file ? getRelFile(ctx.lang, file) : ctx.relFile;
    const tokens = await expandTokens(marked.lexer(selectLines(fm(text).body, range)), { ...ctx, relFile });
    rebaseLinks(tokens, relFile, ctx.relFile);
    return tokens;
  },
  /** 显示文件内容 */
  raw: async ({ src, codelang, range, highlight }) => {
    const { text } = await readSrc(src);
    const lang = codelang || src.split('?')[0].split('.').pop() || '';
    return [htmlToken(renderCode(text, { lang, filename: src, range, highlight }))];
  },
  /** 元素和模块的 API 文档 */
  api: async ({ src, name, headinglevel }) => {
    const resolved = resolveSrc(src, '', '/');
    if (!('file' in resolved)) throw new Error('only supports local file');
    return marked.lexer(renderApi(resolved.file, { name, headingLevel: Number(headinglevel) || 3 }));
  },
  /** 图片、视频和音频 */
  media: async ({ src, type, width = '', height = '' }) => {
    const resolved = resolveSrc(src, '', '/');
    const url = 'url' in resolved ? resolved.url : getFileUrl(resolved.file);
    const ext = src.split('?')[0].split('.').pop() || '';
    const mediaType = type || Object.entries(MEDIA_TYPES).find(([, reg]) => reg.test(ext))?.[0];
    const attrs = toAttrs({ class: 'media', src: url, width, height });
    switch (mediaType) {
      case 'img':
        return [htmlToken(`<img${attrs} alt="" loading="lazy">`)];
      case 'video':
      case 'audio':
        return [htmlToken(`<${mediaType}${attrs} controls></${mediaType}>`)];
      default:
        throw new Error(`unknown media type: ${src}`);
    }
  },
};

// 属性值中可能有 `>`，例如 `range="[!NOTE]->"`
const PLUGIN_REG = /^\s*<gbp-([\w-]+)\b((?:[^>"]|"[^"]*")*)>\s*(?:<\/gbp-\1>)?\s*$/;
/** 只有一个自定义元素（例如插件）的段落，例如开始和结束标签在同一行时 */
const ELEMENT_PARAGRAPH_REG = /^\s*<([a-z][\w]*-[\w-]*)\b[\s\S]*<\/\1>\s*$/;
const EXAMPLE_OPEN_REG = /^\s*<gbp-example\b((?:[^>"]|"[^"]*")*)>\s*$/;
const EXAMPLE_CLOSE_REG = /^\s*<\/gbp-example>\s*$/;

/**
 * 展开独占一行的服务端插件（代码块中的不会处理），
 * `<gbp-example>` 中的 JSON 代码块转换成属性，元素渲染时不需要读取子元素
 */
async function expandTokens(tokens: Token[], ctx: MarkdownContext): Promise<Token[]> {
  rewriteSrc(tokens, ctx);
  const result: Token[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    // 开始和结束标签在同一行时不是 HTML 块，而是只有该元素的段落
    const isBlock = (token.type === 'html' && token.block) || token.type === 'paragraph';
    if (!isBlock) {
      result.push(token);
      continue;
    }
    const [, name, attrs] = token.raw.match(PLUGIN_REG) || [];
    if (name && name in plugins) {
      try {
        const pluginAttrs = parseAttrs(attrs);
        if (pluginAttrs.src) pluginAttrs.src = toProjectPath(pluginAttrs.src, ctx);
        result.push(...(await plugins[name](pluginAttrs, ctx)));
      } catch (err) {
        result.push(htmlToken(`<p class="plugin-error">gbp-${name}: ${escapeHTML(String(err))}</p>`));
      }
      continue;
    }
    // 不放在 `<p>` 中，否则子元素中有 `<div>` 等元素时，浏览器解析的 DOM 和模版不同，不能水合
    if (token.type === 'paragraph' && ELEMENT_PARAGRAPH_REG.test(token.raw)) {
      result.push(htmlToken(token.raw));
      continue;
    }
    const exampleAttrs = token.raw.match(EXAMPLE_OPEN_REG)?.[1];
    const [code, close] = tokens.slice(i + 1).filter((e) => e.type !== 'space');
    if (
      exampleAttrs !== undefined &&
      code?.type === 'code' &&
      close?.type === 'html' &&
      EXAMPLE_CLOSE_REG.test(close.text)
    ) {
      result.push(htmlToken(`<gbp-example${exampleAttrs} examples="${escapeHTML(code.text)}"></gbp-example>\n`));
      i = tokens.indexOf(close);
      continue;
    }
    result.push(token);
  }
  return result;
}

/** 子元素中的代码块分配到具名插槽，元素渲染时不需要读取子元素 */
function slotCodes(content: string, extraAttrs = '') {
  const files: { filename: string; status: string }[] = [];
  const html = content.replace(/<gem-book-code\b([^>]*)>/g, (_, attrs: string) => {
    const { filename = '', status = '' } = parseAttrs(attrs);
    const slot = files.push({ filename, status }) - 1;
    return `<gem-book-code${attrs} slot="${slot}" headless${extraAttrs}>`;
  });
  return { html, files: escapeHTML(JSON.stringify(files)) };
}

/** 全局变量 */
const GBP_VAR_REG = /<gbp-var>([^<]*)<\/gbp-var>/g;

/** 渲染后处理的插件 */
const postProcess = (html: string) =>
  html
    // 网址或者本地模块注册的名称（相对于项目目录的路径）
    .replace(/(<gbp-import\b(?:[^>"]|"[^"]*")*?\ssrc=")([^"]*)"/g, (_, start, src: string) => {
      const resolved = resolveSrc(src, '', '/');
      return `${start}${'url' in resolved ? resolved.url : toPosix(path.relative(PROJECT_DIR, resolved.file))}"`;
    })
    .replace(GBP_VAR_REG, (_, name: string) => escapeHTML(getGlobal(name)))
    .replace(
      /<gbp-code-group\b((?:[^>"]|"[^"]*")*)>([\s\S]*?)<\/gbp-code-group>/g,
      (_, attrs: string, content: string) => {
        const { html: slotted, files } = slotCodes(content);
        return `<gbp-code-group${attrs} files="${files}">${slotted}</gbp-code-group>`;
      },
    )
    // 代码可以编辑
    .replace(/<gbp-sandpack\b((?:[^>"]|"[^"]*")*)>([\s\S]*?)<\/gbp-sandpack>/g, (_, attrs: string, content: string) => {
      const { html: slotted, files } = slotCodes(content, ' editable');
      return `<gbp-sandpack${attrs} files="${files}">${slotted}</gbp-sandpack>`;
    });

export async function renderMarkdown(md: string, ctx: MarkdownContext) {
  const headings: Heading[] = [];
  const tokens = await expandTokens(marked.lexer(md), ctx);
  const html = postProcess(marked.parser(tokens, { renderer: createRenderer(ctx, headings) }));
  return { html, headings, tokens };
}

export const renderInline = (s = '') => marked.parseInline(s, { async: false }) as string;

/** 页面的 Markdown 地址，例如 `/en/guide/sort.md`，首页是 `/en/index.md` */
export const toMarkdownUrl = (lang: string, pagePath: string) =>
  `${localizePath(lang, pagePath).replace(/\/$/, '')}${pagePath === '/' ? '/index' : ''}.md`;

/** 给 LLM 的插件展开结果，是 Markdown */
const markdownPlugins: Record<string, (attrs: Record<string, string>, ctx: MarkdownContext) => Promise<string>> = {
  include: async ({ src, range }, ctx) => {
    const { text, file } = await readSrc(src);
    const relFile = file ? getRelFile(ctx.lang, file) : ctx.relFile;
    return renderLlmMarkdown(selectLines(fm(text).body, range), { ...ctx, relFile });
  },
  raw: async ({ src, codelang, range }) => {
    const { text } = await readSrc(src);
    const lang = codelang || src.split('?')[0].split('.').pop() || '';
    return `\`\`\`${lang} ${src}\n${selectLines(text, range).replace(/\r?\n$/, '')}\n\`\`\`\n`;
  },
  api: async ({ src, name, headinglevel }) => {
    const resolved = resolveSrc(src, '', '/');
    if (!('file' in resolved)) throw new Error('only supports local file');
    return renderApi(resolved.file, { name, headingLevel: Number(headinglevel) || 3 });
  },
  media: async ({ src }) => {
    const resolved = resolveSrc(src, '', '/');
    return `![](${'url' in resolved ? resolved.url : getFileUrl(resolved.file)})\n`;
  },
};

/** 只有插件元素标签的 HTML，例如 `<gbp-example>`、`</gbp-sandpack>`，给 LLM 时去掉 */
const PLUGIN_TAGS_REG = /^\s*(<\/?gbp-[\w-]+\b(?:[^>"]|"[^"]*")*>\s*)+$/;

/**
 * 给 LLM 的 Markdown：展开服务端插件，去掉其他插件元素（保留其中的代码块），
 * 相对链接转换成页面的 Markdown 地址，资源转换成网址
 */
export async function renderLlmMarkdown(md: string, ctx: MarkdownContext): Promise<string> {
  const toUrl = (href: string) => {
    if (!href.startsWith('.')) return href;
    const { pathname, hash } = new URL(href, `gbp:${ctx.relFile}`);
    return pathname.endsWith('.md') ? `${toMarkdownUrl(ctx.lang, toPagePath(pathname))}${hash}` : toAssetUrl(href, ctx);
  };
  let result = '';
  for (const token of marked.lexer(md)) {
    const isBlock = (token.type === 'html' && token.block) || token.type === 'paragraph';
    const [, name, attrs] = (isBlock && token.raw.match(PLUGIN_REG)) || [];
    if (name && name in markdownPlugins) {
      const pluginAttrs = parseAttrs(attrs);
      if (pluginAttrs.src) pluginAttrs.src = toProjectPath(pluginAttrs.src, ctx);
      result += `${await markdownPlugins[name](pluginAttrs, ctx).catch(() => '')}\n`;
    } else if (isBlock && PLUGIN_TAGS_REG.test(token.raw)) {
    } else if (token.type === 'code') {
      result += token.raw;
    } else {
      result += token.raw
        .replace(/(\]\()(\.[^)\s]*)/g, (_, start: string, href: string) => start + toUrl(href))
        .replace(GBP_VAR_REG, (_, name: string) => getGlobal(name));
    }
  }
  return result;
}
