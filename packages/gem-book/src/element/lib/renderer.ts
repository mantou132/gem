import { html, connect } from '@mantou/gem';
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

export const blockquoteStyle = /*css*/ `
  blockquote {
    --highlight: ${theme.textColor};
    border-left: ${theme.normalRound} solid rgb(from var(--highlight) r g b / 0.05);
    border-radius: ${theme.normalRound};
    margin: 2rem 0px;
    padding: 0.8em 1em;
    break-inside: avoid;

    &,
    & code,
    & gem-book-pre {
      background: rgb(from var(--highlight) r g b / 0.05);
    }
    &.note {
      --highlight: ${theme.noteColor};
    }
    &.tip {
      --highlight: ${theme.tipColor};
    }
    &.important {
      --highlight: ${theme.importantColor};
    }
    &.warning {
      --highlight: ${theme.warningColor};
    }
    &.caution {
      --highlight: ${theme.cautionColor};
    }
    & > .title {
      font-weight: bold;
      color: rgb(var(--highlight));
    }
    & > p {
      margin: 0.5em 0 0;
    }
    & > :first-child {
      margin-top: 0;
    }
  }
`;

export const headingStyle = /*css*/ `
  .header-anchor {
    font-size: 0.75em;
    margin-inline-start: 0.25em;
    opacity: 0;
    border-bottom: none;
    text-decoration: none;
    &::before {
      content: '#';
    }
  }
  .header-anchor:focus,
  .markdown-header:hover .header-anchor {
    opacity: 1;
  }
`;

export const tableStyle = /*css*/ `
  .table-wrap {
    margin: 2rem 0;
    width: max-content;
    max-width: 100%;
    border: 1px solid ${theme.borderColor};
    border-radius: ${theme.normalRound};
    overflow: auto;
  }
  table {
    min-width: 100%;
    border-collapse: collapse;

    :where(td, th):not(:last-of-type) {
      border-right: 1px solid ${theme.borderColor};
    }
    tr:not(:last-of-type) {
      border-bottom: 1px solid ${theme.borderColor};
    }
    tbody tr:hover {
      background: rgb(from ${theme.textColor} r g b / 0.02);
    }
    :where(td, th) {
      padding: 0.75em 1em;
    }
    :where(td, th):not([align]) {
      text-align: left;
    }
    thead {
      color: ${theme.textColor};
      background: rgb(from ${theme.textColor} r g b / 0.05);
    }
    thead th {
      font-weight: normal;
    }
  }
`;

export const linkStyle = /*css*/ `
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
  // 只包含链接样式
  const cssStr = /*css*/ `
    ${linkStyle}
    ${style}
  `;
  return html`<gem-unsafe content=${htmlStr} contentcss=${cssStr}></gem-unsafe>`;
}
