import path from 'node:path';

import type { Compiler } from '@rspack/core';
import { HtmlRspackPlugin, sources } from '@rspack/core';
import SitemapWebpackPlugin from 'sitemap-rspack-plugin';

import type { BookConfig, NavItem } from '../common/config';
import { getBody, getLinkPath, getUserLink } from '../common/utils';
import { getMdFile, getMetadata } from './utils';

export class FallbackLangPlugin {
  fallbackLanguage?: string;

  constructor(fallbackLanguage?: string) {
    this.fallbackLanguage = fallbackLanguage;
  }

  apply(compiler: Compiler) {
    compiler.hooks.compilation.tap('htmlWebpackInjectAttributesPlugin', (compilation) => {
      HtmlRspackPlugin.getCompilationHooks(compilation).afterTemplateExecution.tapAsync('MyPlugin', (data, cb) => {
        if (this.fallbackLanguage) {
          data.html = data.html.replace('<html', `<html lang="${this.fallbackLanguage}"`);
        }
        cb(null, data);
      });
    });
  }
}

export class ExecHTMLPlugin {
  apply(compiler: Compiler) {
    compiler.hooks.compilation.tap('htmlWebpackInjectAttributesPlugin', (compilation) => {
      HtmlRspackPlugin.getCompilationHooks(compilation).afterTemplateExecution.tapAsync('MyPlugin', (data, cb) => {
        // 参数有 _html_ 时直接渲染 _html_，用于 sandpack plugin
        data.html = data.html.replace(
          /(<head.*?>)/i,
          `
          $1
          <script>
            const content = new URLSearchParams(location.search).get('_html_');
            if (content) {
              document.write(\`
                <script>
                  async function decompressString(base64) {
                    const { base64ToArrayBuffer } = await import('https://esm.sh/duoyun-ui/lib/encode');
                    Uint8Array.fromBase64 = (string) => {
                      return new Uint8Array(base64ToArrayBuffer(string));
                    };
                    const arr = Uint8Array.fromBase64(base64, { alphabet: 'base64url' });
                    const ds = new DecompressionStream('gzip');
                    const stream = new Blob([arr]).stream().pipeThrough(ds);
                    return new Response(stream).text();
                  }
                  decompressString("\${content}").then((html) => document.write(html));
                <\\/script>
              \` + '<!--');
            }
          </script>
          `,
        );
        cb(null, data);
      });
    });
  }
}

export interface MdDocument {
  id: string;
  title: string;
  text: string;
}

function genDocuments(docsDir: string, bookConfig: BookConfig) {
  const gen = (sidebar: NavItem[], lang = '') => {
    // 防止文件夹重复
    const addedLinks = new Set<string>();
    const documents: MdDocument[] = [];
    const temp = [...sidebar];
    while (temp.length) {
      const item = temp.pop()!;
      if (item.sidebarIgnore) continue;
      if (item.children) temp.push(...item.children);

      if (addedLinks.has(item.link)) continue;
      if (item.type === 'file' || item.type === 'dir') {
        addedLinks.add(item.link);
        const fullPath = path.join(docsDir, lang, item.link);
        documents.push({
          // 通过路径来识别文件和目录，以获取父级 title，例如：
          // `/guide/readme` 的父级 title 是 `/guide/` 的目录 title
          id: getLinkPath(item.link, bookConfig.displayRank),
          text: item.type === 'file' ? getBody(getMdFile(fullPath).content) : '',
          title: getMetadata(fullPath, bookConfig.displayRank).title,
        });
      }
    }
    return documents;
  };
  if (Array.isArray(bookConfig.sidebar)) {
    return { '': gen(bookConfig.sidebar) };
  } else {
    return Object.fromEntries(
      Object.entries(bookConfig.sidebar || {}).map(([lang, { data }]) => [lang, gen(data, lang)]),
    );
  }
}

export class LocalSearchSearch {
  docsDir: string;
  bookConfig: BookConfig;

  constructor(docsDir: string, bookConfig: BookConfig) {
    this.docsDir = docsDir;
    this.bookConfig = bookConfig;
  }

  apply(compiler: Compiler) {
    compiler.hooks.compilation.tap('json-webpack-plugin', (compilation) => {
      compilation.hooks.processAssets.tap('json-webpack-plugin', () => {
        Object.entries(genDocuments(this.docsDir, this.bookConfig)).forEach(([lang, documents]) => {
          compilation.emitAsset(
            ['documents', lang, 'json'].filter((e) => !!e).join('.'),
            new sources.RawSource(JSON.stringify(documents)),
          );
        });
      });
    });
  }
}

function genPaths(bookConfig: BookConfig) {
  const result: string[] = [];
  const gen = (sidebar: NavItem[], lang = '') => {
    const temp = [...sidebar];
    while (temp.length) {
      const item = temp.pop()!;
      if (item.sidebarIgnore) continue;
      if (item.children) temp.push(...item.children);
      if (item.type === 'file') {
        result.push(`${lang ? `/${lang}` : ''}${getUserLink(item.link, bookConfig.displayRank)}`);
      }
    }
  };
  if (Array.isArray(bookConfig.sidebar)) {
    gen(bookConfig.sidebar);
  } else {
    Object.entries(bookConfig.sidebar || {}).forEach(([lang, { data }]) => {
      gen(data, lang);
    });
  }
  return result;
}

export class SitemapPlugin extends SitemapWebpackPlugin {
  constructor(site: string, bookConfig: BookConfig) {
    super({ base: site, paths: genPaths(bookConfig) });
  }
}
