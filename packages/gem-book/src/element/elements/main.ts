import { html, GemElement, customElement, css, property } from '@mantou/gem';
import { Renderer, parse } from 'marked';
import { mediaQuery } from '@mantou/gem/helper/mediaquery';

import { theme } from '../helper/theme';

import '@mantou/gem/elements/unsafe';
import '@mantou/gem/elements/link';
import '@mantou/gem/elements/reflect';
import './pre';

const parser = new DOMParser();

@customElement('gem-book-main')
export class Main extends GemElement {
  @property content: string;
  @property renderer: Renderer;

  #linkStyle = css`
    .link {
      display: inline-flex;
      align-items: center;
      gap: 0.2em;
      color: inherit;
      text-decoration: none;
      line-height: 1.2;
      background: rgba(${theme.primaryColorRGB}, 0.2);
      border-bottom: 1px solid rgba(${theme.textColorRGB}, 0.4);
    }
    .link code {
      background: transparent;
      padding: 0;
    }
    .link:hover {
      background: rgba(${theme.primaryColorRGB}, 0.4);
      border-color: currentColor;
    }
  `;

  #hashChangeHandle = () => {
    const { hash } = location;
    const ele = hash && this.shadowRoot?.querySelector(decodeURIComponent(hash));
    if (!hash) {
      document.body.scroll(0, 0);
    } else if (ele) {
      // webkit bug: https://bugs.webkit.org/show_bug.cgi?id=208110
      ele.scrollIntoView({
        block: 'start',
      });
    }
  };

  render() {
    return html`
      ${this.parseMarkdown(this.content)}
      <style>
        ${this.#linkStyle}
      </style>
      <style>
        :not(:defined)::before {
          display: block;
          content: 'The element is not defined';
          padding: 1em;
          border-radius: 0.25rem;
          text-align: center;
          background: ${theme.borderColor};
        }
        :host {
          -webkit-print-color-adjust: economy;
          color-adjust: economy;
          display: block;
          width: 100%;
          box-sizing: border-box;
          z-index: 1;
          line-height: 1.7;
        }
        :host :first-child {
          margin-top: 0;
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
          margin: 7rem 0 2rem;
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
        table {
          margin: 2rem 0;
          width: 100%;
          border-spacing: 0;
          border-collapse: separate;
        }
        table td,
        table th {
          padding: 12px 10px;
          border-bottom: 1px solid ${theme.borderColor};
          text-align: left;
        }
        thead th {
          color: ${theme.textColor};
          background: rgba(${theme.textColorRGB}, 0.05);
          border-bottom: 1px solid ${theme.borderColor};
          border-top: 1px solid ${theme.borderColor};
          font-weight: normal;
          font-size: 12px;
          padding: 10px;
        }
        :host > ol,
        :host > ul {
          padding-left: 1.25rem;
          margin: 1rem 0;
        }
        .contains-task-list {
          list-style: none;
          padding-left: 0;
        }
        img {
          max-width: 100%;
        }
        blockquote {
          background: rgba(${theme.textColorRGB}, 0.05);
          border-left: 0.5rem solid rgba(${theme.textColorRGB}, 0.05);
          margin: 1.2em 0;
          padding: 0.8em 1em;
        }
        blockquote p {
          margin: 0.5em 0 0;
        }
        blockquote > :first-child {
          margin-top: 0;
          font-weight: bold;
        }
        blockquote > :nth-child(n + 2),
        blockquote > :last-child {
          font-weight: normal;
        }
        hr {
          height: 1px;
          padding: 0;
          margin: 3rem 0;
          background-color: ${theme.borderColor};
          border: 0;
        }
        .header-anchor {
          float: left;
          line-height: 1;
          margin-left: -1.25rem;
          padding-right: 0.25rem;
          opacity: 0;
          border-bottom: none;
        }
        .header-anchor:hover {
          opacity: 1;
          border-bottom: none;
        }
        .header-anchor svg {
          vertical-align: middle;
          fill: currentColor;
        }
        .markdown-header:focus,
        .markdown-header:hover {
          outline: none;
        }
        .markdown-header:focus .header-anchor,
        .markdown-header:hover .header-anchor {
          opacity: 1;
        }
        code {
          font-family: Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace;
          font-size: 90%;
          background: ${theme.inlineCodeBackground};
          padding: 0 3px;
        }
        gem-book-pre {
          z-index: 2;
          margin: 1rem 0px;
        }
        @media ${mediaQuery.PHONE} {
          .header-anchor {
            display: none;
          }
          h1 {
            font-size: 2.5rem;
          }
          @media screen {
            gem-book-pre {
              margin: 1rem -1rem;
              border-radius: 0;
            }
          }
        }
      </style>
    `;
  }

  mounted() {
    this.#hashChangeHandle();
    window.addEventListener('hashchange', this.#hashChangeHandle);
    return () => {
      window.removeEventListener('hashchange', this.#hashChangeHandle);
    };
  }

  parseMarkdown(mdBody: string) {
    return [...parser.parseFromString(parse(mdBody, { renderer: this.renderer }), 'text/html').body.children];
  }

  unsafeRenderHTML(s: string, style = '') {
    const htmlstr = parse(s, { renderer: this.renderer });
    const cssstr = css`
      ${this.#linkStyle}
      ${style}
    `;
    return html`<gem-unsafe content=${htmlstr} contentcss=${cssstr}></gem-unsafe>`;
  }
}

export const mdRender = new Main();
