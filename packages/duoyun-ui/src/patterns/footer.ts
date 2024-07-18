import { GemElement, html } from '@mantou/gem/lib/element';
import { Emitter, adoptedStyle, customElement, globalemitter, property } from '@mantou/gem/lib/decorators';
import { createCSSSheet, css } from '@mantou/gem/lib/utils';
import { mediaQuery } from '@mantou/gem/helper/mediaquery';

import { theme } from '../lib/theme';
import { icons } from '../lib/icons';
import { isRemoteIcon } from '../lib/utils';
import { focusStyle } from '../lib/styles';

import '../elements/link';
import '../elements/use';
import '../elements/divider';

type Link = {
  label: string;
  href: string;
};

type SocialItem = {
  icon: string | Element | DocumentFragment;
} & Link;

export type Social = {
  label: string;
  items: SocialItem[];
};

export type Links = {
  label: string;
  href?: string;
  items?: Link[];
}[];

export type Terms = Link[];

export type Help = Link;

export type Languages = {
  current: string;
  /**language code -> display name */
  names: Record<string, string>;
};

const style = createCSSSheet(css`
  :scope {
    display: block;
    background: ${theme.lightBackgroundColor};
    line-height: 1.7;
  }

  dy-link {
    outline-offset: 0;
    display: inline-flex;
    align-items: center;
    gap: 0.5em;
  }
  .outward {
    width: 1.2em;
  }
  footer {
    container-type: inline-size;
    max-width: 80em;
    margin: auto;
  }
  @container (width < 80em) {
    :is(.social, .links, .terms-wrap) {
      padding-inline: 1em;
    }
    .outward {
      display: none;
    }
  }
  ul {
    display: contents;
    padding: 0;
    margin: 0;
  }
  li {
    list-style: none;
  }
  :is(.terms, .social) {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 2em;
  }
  :is(.terms-nav, .help, .social ul) {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 1.5em;
  }
  :is(.links, .terms-nav, .help) :where(dy-link, select):not(:hover) {
    opacity: 0.65;
  }
  .social {
    padding-block: 1.5em;
  }
  .social li {
    display: contents;
  }
  h3 {
    margin: 0;
    font-weight: 500;
    font-size: 1em;
  }
  .icon {
    width: 2em;
  }
  .links {
    padding-block: 2.5em;
    display: flex;
    flex-wrap: wrap;
    gap: 1em;
  }
  .column {
    width: 0;
    min-width: 10em;
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    gap: 0.6em;
  }
  h4 {
    font-weight: 500;
    margin-block: 0 1em;
    font-size: 1em;
  }
  .terms-wrap {
    display: flex;
    gap: 2em;
    justify-content: space-between;
    flex-wrap: wrap;
    padding-block: 1.5em 3em;
  }
  .logo {
    height: 4em;
  }
  .languages {
    min-width: 10em;
    font-size: 1em;
    border: none;
    border-bottom: 1px solid;
    background: transparent;
    padding-block: 0.25em;
  }
`);

const mobileStyle = createCSSSheet(
  mediaQuery.PHONE,
  css`
    :scope {
      .column {
        width: 100%;
      }
      .column + .column {
        border-block-start: 1px solid ${theme.borderColor};
        padding-block-start: 1em;
      }
    }
  `,
);

/**
 * @customElement dy-pat-footer
 */
@customElement('dy-pat-footer')
@adoptedStyle(mobileStyle)
@adoptedStyle(style)
@adoptedStyle(focusStyle)
export class DyPatFooterElement extends GemElement {
  @property social?: Social;
  @property links?: Links;

  @property logo?: string | Element | DocumentFragment;
  @property terms?: Terms;

  @property help?: Help;
  @property languages?: Languages;

  @globalemitter languagechange: Emitter<string>;

  #isOutwardLink(href: string) {
    return new URL(href, location.origin).origin !== location.origin;
  }

  #onChange = (evt: Event) => {
    evt.stopPropagation();
    this.languagechange((evt.target as HTMLSelectElement).value);
  };

  #renderIcon({ icon, label }: Omit<SocialItem, 'href'>, className = '') {
    return isRemoteIcon(icon)
      ? html`<img title=${label} class=${className} src=${icon}></img>`
      : html`<dy-use title=${label} class=${className} .element=${icon}></dy-use>`;
  }

  #renderLinks(items: Link[] | SocialItem[], renderOutward = false) {
    return html`
      <ul>
        ${items.map(
          (item) => html`
            <li>
              <dy-link href=${item.href}>
                ${'icon' in item
                  ? this.#renderIcon(item, 'icon')
                  : html`
                      ${item.label}
                      ${renderOutward && this.#isOutwardLink(item.href)
                        ? html`<dy-use class="outward" .element=${icons.outward}></dy-use>`
                        : ''}
                    `}
              </dy-link>
            </li>
          `,
        )}
      </ul>
    `;
  }

  render = () => {
    return html`
      <footer>
        ${this.social
          ? html`
              <div class="social">
                <h3>${this.social.label}</h3>
                ${this.#renderLinks(this.social.items)}
              </div>
              <dy-divider size="small"></dy-divider>
            `
          : ''}

        <nav class="links">
          ${this.links?.map(
            ({ label, items }) => html`
              <div class="column">
                <h4>${label}</h4>
                ${items && this.#renderLinks(items, true)}
              </div>
            `,
          )}
        </nav>

        <dy-divider size="small"></dy-divider>

        <div class="terms-wrap">
          <div class="terms">
            ${this.logo ? html`<div>${this.#renderIcon({ icon: this.logo, label: 'Logo' }, 'logo')}</div>` : ''}
            ${this.terms ? html`<nav class="terms-nav">${this.#renderLinks(this.terms)}</nav>` : ''}
          </div>
          <div class="help">
            ${this.help
              ? html`
                  <dy-link href=${this.help.href}>
                    <dy-use .element=${icons.help} style="gap: 0.5em">${this.help.label}</dy-use>
                  </dy-link>
                `
              : ''}
            ${this.languages
              ? html`
                  <select class="languages" @change=${this.#onChange}>
                    ${Object.entries(this.languages.names).map(
                      ([lang, name]) => html`
                        <option ?selected=${this.languages?.current === lang} value=${lang}>${name}</option>
                      `,
                    )}
                  </select>
                `
              : ``}
          </div>
        </div>
      </footer>
    `;
  };
}
