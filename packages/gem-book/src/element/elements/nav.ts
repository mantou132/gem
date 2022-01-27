import { html, GemElement, customElement, refobject, RefObject, globalemitter, connectStore } from '@mantou/gem';
import { mediaQuery } from '@mantou/gem/helper/mediaquery';

import { NavItem } from '../../common/config';
import { theme } from '../helper/theme';
import { capitalize, isSameOrigin } from '../lib/utils';
import { bookStore } from '../store';

import { container } from './icons';

import '@mantou/gem/elements/link';
import '@mantou/gem/elements/use';

/**
 * @attr tl
 * @attr icon
 * @attr github
 */
@customElement('gem-book-nav')
@connectStore(bookStore)
export class Nav extends GemElement {
  @globalemitter languagechange = (v: string) => bookStore.languagechangeHandle?.(v);

  @refobject i18nRef: RefObject<HTMLSelectElement>;

  renderI18nSelect = () => {
    const { langList = [], lang } = bookStore;
    if (lang) {
      const name = langList.find(({ code }) => code === lang)?.name;
      return html`
        <div class="item">
          ${mediaQuery.isPhone ? '' : name || lang}
          <gem-use @click=${() => this.i18nRef.element?.click()} .root=${container} selector="#i18n"></gem-use>
          <select
            class="i18n-select"
            aria-label="language select"
            ref=${this.i18nRef.ref}
            @change=${(e: any) => this.languagechange(e.target.value)}
          >
            ${langList.map(({ name, code }) => html`<option value=${code} ?selected=${code === lang}>${name}</option>`)}
          </select>
        </div>
      `;
    }
  };

  renderExternalItem = ({ navTitle, title, link }: NavItem) => {
    if (link) {
      return html`
        <gem-link class="external item" href=${link}>
          ${capitalize(navTitle || title)}
          <gem-use .root=${container} selector="#link"></gem-use>
        </gem-link>
      `;
    }
  };

  renderInternalItem = ({ navTitle, title, link }: NavItem) => {
    if (link) {
      return html`
        <gem-active-link class="item" href=${link} pattern="${link}*">
          ${capitalize(navTitle || title)}
        </gem-active-link>
      `;
    }
  };

  render() {
    const { config, nav = [] } = bookStore;
    const { github = '', icon = '', title = '' } = config || {};
    const githubLink = config ? this.renderExternalItem({ title: 'github', link: github }) : null;
    const internals = nav?.filter((e) => isSameOrigin(e.link)) || [];
    const externals = nav?.filter((e) => !isSameOrigin(e.link)) || [];

    return html`
      <style>
        :host {
          --height: ${theme.headerHeight};
          display: flex;
          line-height: var(--height);
        }
        .item {
          display: flex;
          align-items: center;
          position: relative;
          cursor: pointer;
        }
        .item gem-use {
          margin-left: 0.3rem;
        }
        .i18n-select {
          width: 100%;
          cursor: pointer;
          position: absolute;
          top: 0;
          right: 0;
          left: 0;
          bottom: 0;
          opacity: 0;
        }
        .internals {
          flex-grow: 1;
          display: flex;
        }
        .homelink {
          margin-right: 3rem;
          font-size: 1.2rem;
          font-weight: 700;
        }
        .homelink ~ .item {
          font-weight: 300;
          padding: 0 1rem;
        }
        .internals img {
          height: calc(0.8 * var(--height));
          min-width: calc(0.8 * var(--height));
          object-fit: contain;
          transform: translateX(-10%);
        }
        .item + .item {
          margin-left: 1rem;
        }
        gem-link,
        gem-active-link {
          text-decoration: none;
          color: inherit;
        }
        gem-active-link:active {
          background: rgba(${theme.primaryColorRGB}, 0.1);
        }
        gem-active-link:hover,
        gem-active-link:where([data-active], :--active) {
          color: ${theme.primaryColor};
        }
        gem-active-link:where([data-active], :--active)::after {
          content: '';
          position: absolute;
          left: 0;
          bottom: 0;
          height: 3px;
          background: currentColor;
          width: 100%;
        }
        gem-use {
          width: 15px;
          height: 15px;
        }
        @media ${mediaQuery.PHONE} {
          :host {
            --height: calc(0.875 * ${theme.headerHeight});
          }
          .homelink {
            margin-right: 0;
          }
          .homelink ~ .item {
            padding: 0 0.3rem;
          }
          .external {
            display: none;
          }
        }
      </style>
      <div class="internals">
        <gem-link class="item homelink" path="/">
          ${icon ? html`<img alt=${title} src=${icon} aria-hidden="true" />` : null}
          ${mediaQuery.isPhone && icon && Number(nav?.length) >= 2 ? '' : title}
        </gem-link>
        ${internals.map(this.renderInternalItem)}
      </div>
      ${externals.map(this.renderExternalItem)} ${githubLink} ${this.renderI18nSelect()}
      <slot class="item"></slot>
    `;
  }

  updated() {
    if (this.i18nRef.element && bookStore.lang) {
      // browser history back
      this.i18nRef.element.value = bookStore.lang;
    }
  }
}
