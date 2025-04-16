import {
  adoptedStyle,
  aria,
  connectStore,
  css,
  customElement,
  effect,
  GemElement,
  html,
  memo,
  property,
} from '@mantou/gem';
import { mediaQuery } from '@mantou/gem/helper/mediaquery';

import { getBody } from '../../common/utils';
import { theme } from '../helper/theme';
import { blockquoteStyle, headingStyle, linkStyle, parseMarkdown, tableStyle } from '../lib/renderer';
import { checkBuiltInPlugin } from '../lib/utils';
import { locationStore } from '../store';
import { tocStore } from './toc';

import '@mantou/gem/elements/unsafe';
import '@mantou/gem/elements/link';
import './pre';

const style = css`
  /**
  * 未定义元素提醒
  * https://github.com/w3c/csswg-drafts/issues/9712
  */
  :scope :not(gbp-var, :defined) {
    & {
      display: block;
      margin-block: 2rem;
      color: transparent;
      /* maybe browser limit */
      font-size: 0;
    }
    & * {
      display: none;
    }
    &::before {
      font-size: 1rem;
      display: block;
      content: 'The element is not defined';
      padding: 2rem;
      text-align: center;
      color: ${theme.textColor};
      background: ${theme.borderColor};
      border-radius: ${theme.normalRound};
    }
  }

  :scope {
    -webkit-print-color-adjust: economy;
    color-adjust: economy;
    display: block;
    width: 100%;
    box-sizing: border-box;
    z-index: 1;

    > :first-child {
      margin-top: 0;
    }
    > ol,
    > ul {
      padding-left: 1.25rem;
      margin: 1rem 0;
    }
  }
  details {
    border-radius: ${theme.normalRound};
    padding: 1rem;
    margin: 2rem 0;

    &,
    & code,
    & gem-book-pre {
      background: rgb(from ${theme.noteColor} r g b / 0.05);
    }
    &[open] summary {
      margin-block-end: 0;
    }
    @media print {
      &::details-content {
        display: block;
      }
    }

    p:first-of-type {
      margin-block-start: 0;
    }
    p:last-of-type {
      margin-block-end: 0;
    }
  }
  summary {
    font-weight: bolder;
    cursor: pointer;
    margin: -1rem;
    padding: 1rem;

    p {
      display: contents;
    }
  }
  a {
    color: inherit;

    > img + svg {
      display: none;
    }
    > img {
      margin-bottom: -1px;
    }
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
  img {
    max-width: 100%;
    border-radius: ${theme.normalRound};
  }
  kbd {
    font-family: monospace;
    margin-inline: 0.2em;
    padding: 0.15em 0.4em 0.1em;
    font-size: 0.9em;
    line-height: 1.2;
    background: rgb(from ${theme.textColor} r g b / 0.05);
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
  code {
    font-family: ${theme.codeFont};
    padding: 0.15em 0.4em 0.1em;
    font-size: 0.9em;
    background: rgb(from ${theme.textColor} r g b / 0.05);
    border-radius: ${theme.smallRound};
  }
  gem-book-pre {
    margin: 2rem 0px;
  }
  iframe {
    width: 100%;
    box-sizing: border-box;
    height: max(35em, 60vh);
    border: 1px solid ${theme.borderColor};
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
  ${linkStyle}
  ${tableStyle}
  ${headingStyle}
  ${blockquoteStyle}
`;

@customElement('gem-book-main')
@adoptedStyle(style)
@connectStore(locationStore)
@aria({ role: 'article' })
export class Main extends GemElement {
  @property content?: string;

  static detailsStateCache = new Map<string, boolean>();

  #content: Element[] = [];

  @memo((i) => [i.content])
  #calc = () => {
    const mdBody = getBody(this.content);
    this.#content = parseMarkdown(mdBody).map((detailsEle) => {
      if (detailsEle instanceof HTMLDetailsElement) {
        const key = locationStore.path + detailsEle.innerHTML;
        detailsEle.open = !!Main.detailsStateCache.get(key);
        detailsEle.addEventListener('toggle', () => {
          Main.detailsStateCache.set(key, detailsEle.open);
        });
      }
      return detailsEle;
    });
  };

  #updateToc = () => {
    tocStore({
      elements: [...this.querySelectorAll<HTMLHeadingElement>('h2,h3')],
    });
  };

  @effect((i) => [i.content])
  #observe = () => {
    checkBuiltInPlugin(this);

    this.#updateToc();

    const mo = new MutationObserver(() => {
      checkBuiltInPlugin(this);
      this.#updateToc();
    });
    mo.observe(this, { childList: true, subtree: true });

    return () => mo.disconnect();
  };

  @effect(() => [locationStore.hash])
  #scrollIntoView = () => {
    if (!locationStore.hash) return;
    this.querySelector(`[id="${locationStore.hash.slice(1)}"]`)?.scrollIntoView({
      block: 'start',
    });
  };

  render() {
    return html`${this.#content} `;
  }
}
