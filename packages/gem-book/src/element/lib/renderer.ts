import { Renderer } from 'marked';

import { icons } from '../elements/icons';
import { normalizeId, parseTitle } from '../../common/utils';

import { isSameOrigin, getUserLink, escapeHTML, textContent, joinPath } from './utils';

export function getRenderer({ lang, link, displayRank }: { lang: string; link: string; displayRank?: boolean }) {
  const renderer = new Renderer();
  // https://marked.js.org/using_pro#renderer
  renderer.heading = function (fullText, level) {
    // # heading {#custom-id}
    const { text, customId } = parseTitle(textContent(fullText));
    const tag = `h${level}`;
    const id = normalizeId(customId || text);
    return `<${tag} class="markdown-header" id="${id}">${escapeHTML(
      text,
    )}<a class="header-anchor" aria-hidden="true" href="#${id}"></a></${tag}>`;
  };

  renderer.blockquote = (quote) => {
    let type = '';
    const q = quote.replace(/^<p>\[!(.*)\]/, (_str, $1) => {
      type = $1;
      return `<p class="title">${$1}</p><p>`;
    });
    return `<blockquote class="${type.toLowerCase()}">${q}</blockquote>`;
  };

  const table = renderer.table;
  renderer.table = (header: string, body: string) => {
    return `<div class="table-wrap">${table(header, body)}</div>`;
  };

  renderer.code = (code, infoString) => {
    const [lang, ...rest] = infoString?.split(/\s+/) || [];
    const lastArg = rest.pop();
    const lastArgIsHighlight = lastArg && /^(-|\d|,)+$/.test(lastArg);
    const highlight = lastArgIsHighlight ? lastArg : '';
    const [filename = '', status = ''] = lastArgIsHighlight ? rest : [...rest, lastArg];
    return `<gem-book-pre codelang="${lang}" highlight="${highlight}" filename="${filename}" status="${status}">${escapeHTML(
      code,
    )}</gem-book-pre>`;
  };

  renderer.image = (href, title, text) => {
    if (href === null) return text;
    const url = new URL(href, `${location.origin}${joinPath(lang, link)}`);
    return `<img src="${url.href}" alt="${text}" title="${title || ''}"/>`;
  };

  renderer.link = function (href, title, text) {
    if (href?.startsWith('.')) {
      const { search, hash } = new URL(href, location.origin);
      return `<gem-link
          class="link"
          path="${getUserLink(href.replace(/#.*/, ''), displayRank)}"
          hash="${hash}"
          query="${search}"
          title="${title || ''}"
        >${text}</gem-link>`;
    }
    const internal = isSameOrigin(href || '');
    return `<a
        class="link"
        ${internal ? '' : `target="_blank"`}
        href="${href || ''}"
        title="${title || ''}"
      >${text}${internal ? '' : icons.link.trim()}</a>`;
  };
  return renderer;
}
