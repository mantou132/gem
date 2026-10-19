/// <reference path="./env.d.ts" />

/**
 * 插件的服务端 API（`gem-book/plugin/server`），用于 `@server()` 元素等只在服务端执行的代码，
 * 当前文档由当前请求的页面决定
 */
import { history } from '@mantou/gem';

import { i18n } from '$gemkit/i18n';
import { getRelFile, resolveSrc as resolve } from './lib/common.server';
import { getDocFile } from './lib/content.server';
import { type MarkdownContext, renderMarkdown as render } from './lib/markdown.server';

export { getGlobal } from './lib/utils';

/** 当前页面的文档，不是文档页面时相对于语言目录 */
function getContext(): MarkdownContext {
  const lang = i18n.currentLanguage;
  const file = getDocFile(lang, history.getParams().path);
  return { lang, relFile: file ? getRelFile(lang, file) : '/' };
}

/**
 * 解析插件的 `src`：网址，相对于当前文档（`.` 开头）或者项目目录的文件，支持配置的 `importMap`
 */
export function resolveSrc(src: string): { url: string } | { file: string } {
  const { lang, relFile } = getContext();
  return resolve(src, lang, relFile);
}

/**
 * 渲染 Markdown，和文档的渲染一样：代码高亮、相对链接、服务端插件，返回 HTML，
 * 使用 `htmlTemplate` 渲染，其中的元素也能在服务端渲染
 */
export async function renderMarkdown(md: string) {
  return (await render(md, getContext())).html;
}
