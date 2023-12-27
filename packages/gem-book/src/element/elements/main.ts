import { html, GemElement, customElement, css, property, createCSSSheet, adoptedStyle } from '@mantou/gem';
import { Renderer, parse } from 'marked';
import { mediaQuery } from '@mantou/gem/helper/mediaquery';

import { theme } from '../helper/theme';
import { checkBuiltInPlugin } from '../lib/utils';

import { updateTocStore } from './toc';

import '@mantou/gem/elements/unsafe';
import '@mantou/gem/elements/link';
import '@mantou/gem/elements/reflect';
import './pre';

const parser = new DOMParser();

// https://github.com/w3c/csswg-drafts/issues/9712
const style = createCSSSheet(css`
  :not(:defined) {
    display: block;
    font-size: 0;
  }
  :not(:defined) * {
    display: none;
  }
  :not(:defined)::before {
    font-size: 1rem;
    display: block;
    content: 'The element is not defined';
    padding: 1em;
    text-align: center;
    background: ${theme.borderColor};
    border-radius: ${theme.normalRound};
  }
`);

const linkStyle = css`
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

@customElement('gem-book-main')
@adoptedStyle(style)
export class Main extends GemElement {
  @property content: string;
  @property renderer: Renderer;

  // homepage/footer 等内置元素渲染在 main 前面，不能使用自定义渲染器
  static instance?: Main;

  static parseMarkdown(mdBody: string) {
    return [...parser.parseFromString(parse(mdBody, { renderer: Main.instance?.renderer }), 'text/html').body.children];
  }

  static unsafeRenderHTML(s: string, style = '') {
    const htmlStr = parse(s, { renderer: Main.instance?.renderer });
    const cssStr = css`
      ${linkStyle}
      ${style}
    `;
    return html`<gem-unsafe content=${htmlStr} contentcss=${cssStr}></gem-unsafe>`;
  }

  constructor() {
    super();
    Main.instance = this;
  }

  #hashChangeHandle = () => {
    const { hash } = location;
    const ele = hash && this.shadowRoot?.querySelector(`[id="${decodeURIComponent(hash.slice(1))}"]`);
    if (!hash) {
      document.body.scroll(0, 0);
    } else if (ele) {
      ele.scrollIntoView({
        block: 'start',
      });
    }
  };

  #updateToc = () =>
    updateTocStore({
      elements: [...this.shadowRoot!.querySelectorAll<HTMLHeadingElement>('.markdown-header')].slice(1),
    });

  render() {
    return html`
      <style>
        :host {
          -webkit-print-color-adjust: economy;
          color-adjust: economy;
          display: block;
          width: 100%;
          box-sizing: border-box;
          z-index: 1;
        }
        :host > :first-child {
          margin-top: 0;
        }
        details {
          border-radius: ${theme.normalRound};
          border: 1px dashed ${theme.borderColor};
          padding: 0.5em 1em;
        }
        details p:first-of-type {
          margin-block-start: 0;
        }
        details p:first-of-type {
          margin-block-end: 0;
        }
        details[open] summary {
          margin-block-end: 0.5em;
          background: rgba(${theme.textColorRGB}, 0.02);
          border-bottom: 1px dashed ${theme.borderColor};
        }
        summary {
          cursor: pointer;
          margin: -0.5em -1em;
          padding: 0.5em 1em;
        }
        summary p {
          display: contents;
        }
        summary:hover {
          background: rgba(${theme.textColorRGB}, 0.02);
        }
        a > img + svg {
          display: none;
        }
        a > img {
          margin-bottom: -1px;
        }
        a {
          color: inherit;
        }
        h1,
        h2,
        h3,
        h4,
        h5,
        h6 {
          font-weight: bold;
          line-height: 1.2;
          scroll-margin: calc(${theme.headerHeight} + 2rem);
        }
        h1 {
          font-size: 3rem;
          margin: 0 0 1.4rem;
        }
        h2 {
          font-size: 2rem;
          margin: 4rem 0 2rem;
          padding-bottom: 5px;
        }
        h3 {
          font-size: 1.7rem;
          margin: 2.5rem 0 1.5rem;
        }
        h4 {
          font-size: 1.4rem;
          margin: 2rem 0 1rem;
        }
        h5 {
          font-size: 1.1rem;
          margin: 2rem 0 1rem;
        }
        p {
          margin: 1rem 0;
        }
        li > p {
          margin: 0;
        }
        .table-wrap {
          margin: 2rem 0;
          width: 100%;
          border: 1px solid ${theme.borderColor};
          border-radius: ${theme.normalRound};
          overflow: auto;
        }
        table {
          min-width: 100%;
          border-collapse: collapse;
        }
        table tr {
          border-bottom: 1px solid ${theme.borderColor};
        }
        tbody tr:last-of-type {
          border-bottom: none;
        }
        tbody tr:hover {
          background: rgba(${theme.textColorRGB}, 0.02);
        }
        table td,
        table th {
          padding: 0.875em 0.75em;
          text-align: left;
        }
        thead {
          color: ${theme.textColor};
          background: rgba(${theme.textColorRGB}, 0.05);
        }
        thead th {
          font-weight: normal;
        }
        :host > ol,
        :host > ul {
          padding-left: 1.25rem;
          margin: 1rem 0;
        }
        img {
          max-width: 100%;
          border-radius: ${theme.normalRound};
        }
        blockquote {
          --highlight: ${theme.textColorRGB};
          background: rgba(var(--highlight), 0.05);
          border-left: ${theme.normalRound} solid rgba(var(--highlight), 0.05);
          border-radius: ${theme.normalRound};
          margin: 2rem 0px;
          padding: 0.8em 1em;
        }
        blockquote.note {
          --highlight: ${theme.noteColorRGB};
        }
        blockquote.tip {
          --highlight: ${theme.tipColorRGB};
        }
        blockquote.important {
          --highlight: ${theme.importantColorRGB};
        }
        blockquote.warning {
          --highlight: ${theme.warningColorRGB};
        }
        blockquote.caution {
          --highlight: ${theme.cautionColorRGB};
        }
        blockquote > .title {
          font-weight: bold;
          color: rgb(var(--highlight));
        }
        blockquote > p {
          margin: 0.5em 0 0;
        }
        blockquote > :first-child {
          margin-top: 0;
        }
        kbd {
          font-family: monospace;
          margin-inline: 0.2em;
          padding: 0.15em 0.4em 0.1em;
          font-size: 0.9em;
          line-height: 1.2;
          background: rgba(${theme.textColorRGB}, 0.05);
          border: 1px solid ${theme.borderColor};
          border-radius: ${theme.smallRound};
          border-bottom-width: 2px;
        }
        hr {
          height: 1px;
          padding: 0;
          margin: 3rem 0;
          background-color: ${theme.borderColor};
          border: 0;
        }
        .header-anchor {
          font-size: 0.75em;
          margin-inline-start: 0.25em;
          opacity: 0;
          border-bottom: none;
          text-decoration: none;
        }
        .header-anchor::before {
          content: '#';
        }
        .header-anchor:focus,
        .markdown-header:hover .header-anchor {
          opacity: 1;
        }
        code {
          font-family: ${theme.codeFont};
          padding: 0.15em 0.4em 0.1em;
          font-size: 0.9em;
          background: rgba(${theme.textColorRGB}, 0.05);
          border-radius: ${theme.smallRound};
        }
        gem-book-pre {
          z-index: 2;
          margin: 2rem 0px;
          border-radius: ${theme.normalRound};
        }
        @media ${mediaQuery.PHONE} {
          .header-anchor {
            opacity: 1;
          }
          h1 {
            font-size: 2.3rem;
          }
        }
      </style>
      ${Main.parseMarkdown(this.content)}
      <style>
        ${linkStyle}
      </style>
    `;
  }

  mounted() {
    this.effect(
      () => {
        this.#updateToc();
        const mo = new MutationObserver(this.#updateToc);
        mo.observe(this.shadowRoot!, {
          childList: true,
          subtree: true,
        });

        checkBuiltInPlugin(this.shadowRoot!);
        this.#hashChangeHandle();
        window.addEventListener('hashchange', this.#hashChangeHandle);

        return () => {
          window.removeEventListener('hashchange', this.#hashChangeHandle);
          mo.disconnect();
        };
      },
      () => [this.content],
    );
  }
}
