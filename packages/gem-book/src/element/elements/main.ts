import {
  html,
  GemElement,
  customElement,
  css,
  property,
  createCSSSheet,
  adoptedStyle,
  connectStore,
} from '@mantou/gem';
import { mediaQuery } from '@mantou/gem/helper/mediaquery';

import { theme } from '../helper/theme';
import { checkBuiltInPlugin } from '../lib/utils';
import { getBody } from '../../common/utils';
import { parseMarkdown, linkStyle } from '../lib/renderer';
import { locationStore } from '../store';

import { updateTocStore } from './toc';

import '@mantou/gem/elements/unsafe';
import '@mantou/gem/elements/link';
import '@mantou/gem/elements/reflect';
import './pre';

// https://github.com/w3c/csswg-drafts/issues/9712
const style = createCSSSheet(css`
  :not(gbp-var):not(:defined) {
    display: block;
    margin-block: 2rem;
    color: transparent;
    /* maybe browser limit */
    font-size: 0;
  }
  :not(gbp-var):not(:defined) * {
    display: none;
  }
  :not(gbp-var):not(:defined)::before {
    font-size: 1rem;
    display: block;
    content: 'The element is not defined';
    padding: 2rem;
    text-align: center;
    color: ${theme.textColor};
    background: ${theme.borderColor};
    border-radius: ${theme.normalRound};
  }
`);

@customElement('gem-book-main')
@adoptedStyle(style)
@connectStore(locationStore)
export class Main extends GemElement {
  @property content?: string;

  static detailsStateCache = new Map<string, boolean>();

  constructor() {
    super();
    this.memo(
      () => {
        const mdBody = getBody(this.content);
        this.#content = parseMarkdown(mdBody).map((detailsEle) => {
          if (detailsEle instanceof HTMLDetailsElement) {
            const html = locationStore.path + detailsEle.innerHTML;
            detailsEle.open = !!Main.detailsStateCache.get(html);
            detailsEle.addEventListener('toggle', () => {
              Main.detailsStateCache.set(html, detailsEle.open);
            });
          }
          return detailsEle;
        });
        // https://github.com/algolia/renderscript/pull/555
        this.#docsearch = parseMarkdown(mdBody);
      },
      () => [this.content],
    );
  }

  #content: Element[] = [];
  #docsearch: Element[] = [];

  #updateToc = () => {
    updateTocStore({
      elements: [...this.shadowRoot!.querySelectorAll<HTMLHeadingElement>('h2,h3')],
    });
  };

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
          padding: 1rem;
          margin: 2rem 0;
        }
        details,
        details code,
        details gem-book-pre {
          background: rgba(${theme.noteColorRGB}, 0.05);
        }
        details p:first-of-type {
          margin-block-start: 0;
        }
        details p:last-of-type {
          margin-block-end: 0;
        }
        details[open] summary {
          margin-block-end: 0;
        }
        summary {
          font-weight: bolder;
          cursor: pointer;
          margin: -1rem;
          padding: 1rem;
        }
        summary p {
          display: contents;
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
          margin: 0 0 3rem;
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
        li > p:first-of-type {
          margin: 0;
        }
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
        }
        table :where(td, th):not(:last-of-type) {
          border-right: 1px solid ${theme.borderColor};
        }
        table tr:not(:last-of-type) {
          border-bottom: 1px solid ${theme.borderColor};
        }
        tbody tr:hover {
          background: rgba(${theme.textColorRGB}, 0.02);
        }
        table :where(td, th) {
          padding: 0.75em 1em;
        }
        table :where(td, th):not([align]) {
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
          border-left: ${theme.normalRound} solid rgba(var(--highlight), 0.05);
          border-radius: ${theme.normalRound};
          margin: 2rem 0px;
          padding: 0.8em 1em;
        }
        blockquote,
        blockquote code,
        blockquote gem-book-pre {
          background: rgba(var(--highlight), 0.05);
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
            margin: 1rem 0 2rem;
          }
        }
      </style>
      ${this.#content}
      <gem-reflect .target=${document.body}>
        <main hidden>
          <template>${this.#docsearch}</template>
        </main>
      </gem-reflect>
      <style>
        ${linkStyle}
      </style>
    `;
  }

  mounted() {
    this.effect(
      () => {
        checkBuiltInPlugin(this.shadowRoot!);

        this.#updateToc();

        const mo = new MutationObserver(() => {
          checkBuiltInPlugin(this.shadowRoot!);
          this.#updateToc();
        });
        mo.observe(this.shadowRoot!, {
          childList: true,
          subtree: true,
        });

        return () => mo.disconnect();
      },
      () => [this.content],
    );

    this.effect(
      ([hash]) => {
        if (hash) {
          this.shadowRoot?.querySelector(`[id="${hash.slice(1)}"]`)?.scrollIntoView({
            block: 'start',
          });
        }
      },
      () => [locationStore.hash],
    );
  }
}
