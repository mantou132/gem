import { html, GemElement, customElement, part, connectStore, css } from '@mantou/gem';
import { mediaQuery } from '@mantou/gem/helper/mediaquery';

import { theme } from '../helper/theme';
import { getRemotePath, getUserLink, NavItemWithLink } from '../lib/utils';
import { bookStore } from '../store';

import { icons } from './icons';
import { Main } from './main';

import '@mantou/gem/elements/link';
import '@mantou/gem/elements/use';

@customElement('gem-book-homepage')
@connectStore(bookStore)
export class Homepage extends GemElement {
  @part static hero: string;

  renderHero({ hero }: NavItemWithLink) {
    if (!hero) return null;
    const { title, desc, actions } = hero;
    return html`
      <style>
        .hero {
          text-align: center;
          padding: 3.5rem 1rem;
          --tColor: rgba(${theme.textColorRGB}, 0.03);
          --pColor: rgba(${theme.primaryColorRGB}, 0.02);
          background: linear-gradient(var(--tColor), var(--tColor)), linear-gradient(var(--pColor), var(--pColor));
        }
        .title {
          margin: 0;
          padding: 0;
          font-size: 3rem;
          font-weight: bold;
        }
        .desc {
          opacity: 0.6;
          text-wrap: balance;
        }
        .actions {
          display: flex;
          flex-wrap: wrap;
          margin: 2rem;
          gap: 1rem 2.5rem;
          justify-content: center;
          align-items: center;
        }
        gem-link {
          display: flex;
          gap: 1rem;
          color: ${theme.primaryColor};
          text-decoration: none;
          transition: all 0.3s;
          border-radius: ${theme.normalRound};
        }
        gem-link:first-of-type {
          padding: 0.5rem 2rem;
          text-decoration: none;
          color: #fff;
          background: ${theme.primaryColor};
        }
        gem-link:hover {
          filter: brightness(1.1);
        }
        gem-link:active {
          filter: brightness(1.2);
        }
        gem-use {
          margin-left: 0.3rem;
          transform: scale(1.3);
        }
        @media ${mediaQuery.PHONE} {
          .hero {
            padding: 2rem 1rem;
          }
          .title {
            font-size: 2rem;
          }
        }
        @media print {
          .hero {
            background: transparent;
          }
        }
      </style>
      <div class="hero" part=${Homepage.hero} role="banner">
        <div class="body">
          ${!title ? '' : html`<h1 class="title">${title}</h1>`}
          ${!desc ? '' : html`<p class="desc">${Main.unsafeRenderHTML(desc)}</p>`}
          <div class="actions">
            ${actions?.map(
              ({ link, text }, index) =>
                html`<gem-link href=${getUserLink(link)}>
                  ${text}${index ? html`<gem-use .element=${icons.arrow}></gem-use>` : ''}
                </gem-link>`,
            )}
          </div>
        </div>
      </div>
    `;
  }

  renderFeature({ features, originLink }: NavItemWithLink) {
    return html`
      <style>
        .features {
          padding: 3rem;
        }
        .features .body {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          text-align: center;
        }
        .feature:not(.has-icon) {
          border: 1px solid ${theme.borderColor};
          border-radius: ${theme.normalRound};
          padding: 1.5rem 1rem;
        }
        .feature.has-icon {
          width: max(20em, 80%);
          max-width: 100%;
          margin: 0 auto 1rem;
        }
        .icon {
          width: 30%;
          margin-block-end: 1rem;
          object-fit: contain;
        }
        .feat-title {
          margin-block-end: 1rem;
          font-size: 1.5em;
          line-height: 1;
        }
        .feat-desc {
          line-height: 1.5;
          margin: 1rem 0 0;
          letter-spacing: 0.05em;
          opacity: 0.6;
        }
        @media ${mediaQuery.PHONE}, print {
          .features {
            padding: 3rem 1rem;
          }
          .features .body {
            grid-template-columns: auto;
          }
          .feature:not(.has-icon) {
            text-align: left;
          }
          .icon {
            width: 5rem;
          }
          .feat-title,
          .feat-desc {
            margin: 0;
          }
        }
      </style>
      <div role="region" aria-label="features" class="features">
        <dl class="body">
          ${features?.map(
            (feature) => html`
              <div class="feature ${feature.icon ? 'has-icon' : ''}">
                ${feature.icon
                  ? html`<img
                      class="icon"
                      src=${new URL(feature.icon, `${location.origin}${getRemotePath(originLink, bookStore.lang)}`)
                        .href}
                    />`
                  : ''}
                <dt class="feat-title">${feature.title}</dt>
                <dd class="feat-desc">
                  ${Main.unsafeRenderHTML(
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
    return html`
      <style>
        :host {
          overflow: hidden;
        }
        .body {
          margin: auto;
          width: 100%;
          max-width: calc(${theme.sidebarWidth} + ${theme.maxMainWidth});
        }
        @media print {
          :host {
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
          }
        }
      </style>
      ${this.renderHero(homePageLink)}${this.renderFeature(homePageLink)}
    `;
  }
}
