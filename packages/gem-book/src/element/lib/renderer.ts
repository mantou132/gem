import { Renderer } from 'marked';

import { anchorIcon, linkIcon } from '../elements/icons';
import { CUSTOM_HEADING_REG } from '../../common/utils';

import { getRemotePath, isSameOrigin, getUserLink, escapeHTML } from './utils';

export function getRenderer({ lang, link, displayRank }: { lang: string; link: string; displayRank?: boolean }) {
  const renderer = new Renderer();
  // https://github.com/markedjs/marked/blob/ed18cd58218ed4ab98d3457bec2872ba1f71230e/lib/marked.esm.js#L986
  renderer.heading = function (fullText, level, r, slugger) {
    // # heading {#custom-id}
    const [, text, customId] = fullText.match(CUSTOM_HEADING_REG) as RegExpMatchArray;
    const tag = `h${level}`;
    const id = customId || `${this.options.headerPrefix}${slugger.slug(r)}`;
    return `<${tag} class="markdown-header" id="${id}"><a class="header-anchor" aria-hidden="true" href="#${id}">${anchorIcon}</a>${text}</${tag}>`;
  };

  renderer.blockquote = (quote) => {
    let type = '';
    const q = quote.replace(/^<p>\[!(.*)\]/, (_str, $1) => {
      type = $1;
      return `<p class="title">${$1}</p><p>`;
    });
    return `<blockquote class="${type.toLowerCase()}">${q}</blockquote>`;
  };

  renderer.code = (code, infoString) => {
    const [lang, ...rest] = infoString?.split(/\s+/) || [];
    const lastArg = rest.pop();
    const lastArgIsHighlight = lastArg && /^([-]|\d|\s|,)+$/.test(lastArg);
    const highlight = lastArgIsHighlight ? lastArg : '';
    const [filename = '', status = ''] = lastArgIsHighlight ? rest : [...rest, lastArg];
    return `<gem-book-pre codelang="${lang}" highlight="${highlight}" filename="${filename}" status="${status}">${escapeHTML(
      code,
    )}</gem-book-pre>`;
  };

  renderer.image = (href, title, text) => {
    if (href === null) return text;
    const url = new URL(href, `${location.origin}${getRemotePath(link, lang)}`);
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
        ${internal ? '' : `ref="noreferrer" target="_blank"`}
        href="${href || ''}"
        title="${title || ''}"
      >${text}${internal ? '' : linkIcon}</a>`;
  };
  return renderer;
}
