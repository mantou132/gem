import { html, GemElement, customElement, connectStore, css, createCSSSheet, adoptedStyle } from '@mantou/gem';
import { mediaQuery } from '@mantou/gem/helper/mediaquery';

import { getUserLink } from '../../common/utils';
import { theme } from '../helper/theme';
import { joinPath, NavItemWithLink } from '../lib/utils';
import { bookStore } from '../store';
import { unsafeRenderHTML } from '../lib/renderer';
import { GemBookElement } from '..';

import { icons } from './icons';

import '@mantou/gem/elements/link';
import '@mantou/gem/elements/use';

const styles = createCSSSheet(css`
  :scope {
    overflow: hidden;

    @media print {
      -webkit-print-color-adjust: exact;
      color-adjust: exact;
    }
  }
  .body {
    margin: auto;
    width: 100%;
    max-width: calc(${theme.sidebarWidth} + ${theme.maxMainWidth});
  }

  .hero {
    text-align: center;
    padding: 6rem 1rem;
  }
  .title {
    margin: 0;
    padding: 0;
    font-size: 3rem;
    font-weight: bold;
  }
  .desc {
    margin: auto;
    max-width: ${theme.maxMainWidth};
    font-size: 1.5em;
    color: rgb(from ${theme.textColor} r g b / 0.6);
    text-wrap: balance;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    margin-block-start: 2rem;
    gap: 1rem 2.5rem;
    justify-content: center;
    align-items: center;
  }
  gem-link {
    display: flex;
    gap: 0.7rem;
    color: ${theme.primaryColor};
    text-decoration: none;
    transition: all 0.3s;
    border-radius: ${theme.normalRound};
  }
  gem-link:first-of-type {
    padding: 0.5rem 2rem;
    text-decoration: none;
    color: ${theme.backgroundColor};
    background: ${theme.primaryColor};
  }
  gem-link:hover {
    filter: brightness(1.1);
  }
  gem-link:active {
    filter: brightness(1.2);
  }
  gem-use {
    width: 1.2rem;
    margin-left: 0.3rem;
    transform: scale(1.3);
  }
  @media ${mediaQuery.PHONE} {
    .title {
      font-size: 2rem;
    }
    .desc {
      font-size: 1.2em;
    }
  }
  @media print {
    .hero {
      background: transparent;
    }
  }

  .features {
    padding: 3rem;
  }
  .features .body {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
  }
  .features .body[data-len='4'] {
    grid-template-columns: repeat(4, 1fr);
  }
  .feature,
  .icon {
    border-radius: ${theme.normalRound};
    background-color: rgb(from ${theme.textColor} r g b / 0.03);
  }
  .feature {
    padding: 1.5rem;
    break-inside: avoid;
  }
  .icon {
    display: grid;
    place-items: center;
    line-height: 1;
    aspect-ratio: 1;
    width: 3rem;
    font-size: 2.4rem;
    padding: 0.3rem;
    margin-block-end: 1.5rem;
    object-fit: contain;
  }
  .feat-title {
    margin-block-end: 1rem;
    font-size: 1.15em;
    font-weight: 500;
    line-height: 1;
  }
  .feat-desc {
    line-height: 1.7;
    margin: 1rem 0 0;
    color: rgb(from ${theme.textColor} r g b / 0.6);
  }
  @media ${mediaQuery.DESKTOP} {
    .feature {
      max-width: 100%;
      padding: 2rem;
    }
  }
  @media ${mediaQuery.PHONE}, print {
    .features {
      padding: 3rem 1rem;
    }
    .features .body {
      grid-template-columns: auto;
    }
    .feat-title,
    .feat-desc {
      margin: 0;
    }
  }
`);

@customElement('gem-book-homepage')
@connectStore(bookStore)
@adoptedStyle(styles)
export class Homepage extends GemElement {
  #renderHero({ hero }: NavItemWithLink) {
    if (!hero) return null;
    const { title, desc, actions } = hero;
    return html`
      <div class="hero" part=${GemBookElement.homepageHero} role="banner">
        <div class="body">
          ${!title ? '' : html`<h1 class="title">${title}</h1>`}
          ${!desc ? '' : html`<p class="desc">${unsafeRenderHTML(desc)}</p>`}
          <div class="actions">
            ${actions?.map(
              ({ link, text }, index) =>
                html`<gem-link href=${getUserLink(link)}>
                  ${text}${index ? html`<gem-use .element=${icons.forward}></gem-use>` : ''}
                </gem-link>`,
            )}
          </div>
        </div>
      </div>
    `;
  }

  #renderFeature({ features, originLink }: NavItemWithLink) {
    return html`
      <div role="region" aria-label="features" class="features">
        <dl class="body" ?data-len=${features?.length}>
          ${features?.map(
            (feature) => html`
              <div class="feature ${feature.icon ? 'has-icon' : ''}">
                ${!feature.icon
                  ? ''
                  : [...feature.icon].length <= 3
                    ? html`<span class="icon">${feature.icon}</span>`
                    : html`<img
                        class="icon"
                        src=${new URL(feature.icon, `${location.origin}${joinPath(bookStore.lang, originLink)}`).href}
                      />`}
                <dt class="feat-title">${feature.title}</dt>
                <dd class="feat-desc">
                  ${unsafeRenderHTML(
                    feature.desc,
                    css`
                      p:last-of-type {
                        margin-block-end: 0;
                      }
                    `,
                  )}
                </dd>
              </div>
            `,
          )}
        </dl>
      </div>
    `;
  }

  render() {
    const homePageLink = bookStore.links?.find((e) => e.link === bookStore.homePage);
    if (!homePageLink) return null;
    return html` ${this.#renderHero(homePageLink)}${this.#renderFeature(homePageLink)} `;
  }
}
