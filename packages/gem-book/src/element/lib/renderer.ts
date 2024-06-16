import { html, css, connect } from '@mantou/gem';
import { Renderer, parse } from 'marked';

import { icons } from '../elements/icons';
import { normalizeId, getUserLink, parseTitle } from '../../common/utils';
import { theme } from '../helper/theme';
import { bookStore } from '../store';

import { isSameOrigin, escapeHTML, textContent, joinPath } from './utils';

import '@mantou/gem/elements/unsafe';

function getRenderOption() {
  return {
    lang: bookStore.lang || '',
    link: bookStore.getCurrentLink?.()?.originLink || '/',
    displayRank: bookStore.config?.displayRank,
  };
}

let currentRendererKey = '';
let currentRenderer = genRenderer();

function genRenderer(): Renderer {
  const { lang, link, displayRank } = getRenderOption();

  const currentKey = lang + link + displayRank;
  if (currentRendererKey === currentKey) {
    return currentRenderer;
  }

  currentRendererKey = currentKey;

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
    const [codelang, ...rest] = infoString?.split(/\s+/) || [];
    const lastArg = rest.pop();
    const lastArgIsHighlight = lastArg && /^(-|\d|,)+$/.test(lastArg);
    const highlight = lastArgIsHighlight ? lastArg : '';
    const [filename = '', status = ''] = lastArgIsHighlight ? rest : [...rest, lastArg];
    return `<gem-book-pre codelang="${codelang}" highlight="${highlight}" filename="${filename}" status="${status}">${escapeHTML(
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

connect(bookStore, () => {
  currentRenderer = genRenderer();
});

const parser = new DOMParser();

export function parseMarkdown(mdBody: string) {
  return [...parser.parseFromString(parse(mdBody, { renderer: currentRenderer }), 'text/html').body.children];
}

export const linkStyle = css`
  .link {
    color: ${theme.primaryColor};
    text-decoration: none;
    border-bottom: 1px solid transparent;
  }
  .link:hover {
    border-color: currentColor;
  }
  .link svg:last-child {
    vertical-align: -0.1em;
    margin-inline: 0.2em;
  }
`;

export function unsafeRenderHTML(s: string, style = '') {
  const htmlStr = parse(s, { renderer: currentRenderer });
  const cssStr = css`
    ${linkStyle}
    ${style}
  `;
  return html`<gem-unsafe content=${htmlStr} contentcss=${cssStr}></gem-unsafe>`;
}
