import { html, GemElement, customElement, css, property, createCSSSheet, adoptedStyle } from '@mantou/gem';
import { Renderer, parse } from 'marked';
import { mediaQuery } from '@mantou/gem/helper/mediaquery';

import { theme } from '../helper/theme';

import '@mantou/gem/elements/unsafe';
import '@mantou/gem/elements/link';
import '@mantou/gem/elements/reflect';
import './pre';

const parser = new DOMParser();

const style = createCSSSheet(css`
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
  :host > :first-child {
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
  tbody tr:hover {
    background: rgba(${theme.textColorRGB}, 0.02);
  }
  table td,
  table th {
    padding: 12px 10px;
    border-bottom: 1px solid ${theme.borderColor};
    text-align: left;
  }
  thead {
    color: ${theme.textColor};
    background: rgba(${theme.textColorRGB}, 0.05);
  }
  thead th {
    font-size: 12px;
    font-weight: normal;
    border-bottom: 1px solid ${theme.borderColor};
    border-top: 1px solid ${theme.borderColor};
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
    --highlight: ${theme.textColorRGB};
    background: rgba(var(--highlight), 0.05);
    border-left: 0.5rem solid rgba(var(--highlight), 0.05);
    margin: 1.2em 0;
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
    border-bottom-width: 2px;
    border-radius: 2px;
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
    font-family:
      Source Code Pro,
      ui-monospace,
      SFMono-Regular,
      Menlo,
      Monaco,
      Consolas,
      Liberation Mono,
      Courier New,
      monospace;
    padding: 0.15em 0.4em 0.1em;
    font-size: 0.9em;
    background: rgba(${theme.textColorRGB}, 0.05);
    border-radius: 0.125em;
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
        border-radius: 0;
      }
    }
  }
`);

@customElement('gem-book-main')
@adoptedStyle(style)
export class Main extends GemElement {
  @property content: string;
  @property renderer: Renderer;

  #linkStyle = css`
    .link {
      display: inline-flex;
      align-items: center;
      gap: 0.2em;
      color: ${theme.primaryColor};
      text-decoration: none;
      line-height: 1.2;
      border-bottom: 1px solid transparent;
    }
    .link:hover {
      border-color: currentColor;
    }
    .link svg:last-child {
      margin-inline-end: 0.2em;
    }
  `;

  #hashChangeHandle = () => {
    const { hash } = location;
    const ele = hash && this.shadowRoot?.querySelector(`[id="${decodeURIComponent(location.hash.slice(1))}"]`);
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
    `;
  }

  mounted() {
    this.effect(
      () => {
        this.#hashChangeHandle();
        window.addEventListener('hashchange', this.#hashChangeHandle);
        return () => {
          window.removeEventListener('hashchange', this.#hashChangeHandle);
        };
      },
      () => [this.content],
    );
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
