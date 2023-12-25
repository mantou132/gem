import {
  html,
  GemElement,
  customElement,
  refobject,
  RefObject,
  globalemitter,
  connectStore,
  boolattribute,
} from '@mantou/gem';
import { mediaQuery } from '@mantou/gem/helper/mediaquery';

import { NavItem } from '../../common/config';
import { theme } from '../helper/theme';
import { capitalize, isSameOrigin } from '../lib/utils';
import { bookStore } from '../store';

import { icons } from './icons';

import '@mantou/gem/elements/link';
import '@mantou/gem/elements/use';
import './nav-logo';

/**
 * @attr tl
 * @attr icon
 * @attr github
 */
@customElement('gem-book-nav')
@connectStore(bookStore)
export class Nav extends GemElement {
  @boolattribute logo: boolean;

  @globalemitter languagechange = (v: string) => bookStore.languagechangeHandle?.(v);

  @refobject i18nRef: RefObject<HTMLSelectElement>;

  renderI18nSelect = () => {
    const { langList = [], lang } = bookStore;
    if (lang) {
      const name = langList.find(({ code }) => code === lang)?.name;
      return html`
        <div class="item">
          ${mediaQuery.isPhone ? '' : name || lang}
          <gem-use @click=${() => this.i18nRef.element?.click()} .element=${icons.i18n}></gem-use>
          <select
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
          <gem-use .element=${icons.link}></gem-use>
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
    const { github = '' } = config || {};
    const githubLink = config ? this.renderExternalItem({ title: 'github', link: github }) : null;
    const internals = nav?.filter((e) => isSameOrigin(e.link)) || [];
    const externals = nav?.filter((e) => !isSameOrigin(e.link)) || [];

    return html`
      <style>
        :host {
          display: flex;
          box-sizing: border-box;
          height: ${theme.headerHeight};
          border-bottom: 1px solid ${theme.borderColor};
        }
        gem-book-nav-logo + .item {
          margin-left: 3rem;
        }
        .item {
          display: flex;
          align-items: center;
          position: relative;
          cursor: pointer;
          overflow: hidden;
        }
        .item gem-use {
          margin-left: 0.3rem;
        }
        .item select {
          -webkit-appearance: none;
          appearance: none;
          cursor: pointer;
          position: absolute;
          inset: 0;
          opacity: 0;
        }
        .internals {
          flex-grow: 1;
          display: flex;
        }
        .internals .item {
          padding: 0 1rem;
        }
        :where(.item + .item:not(.slot)),
        .slot::slotted(*) {
          margin-left: 1rem;
          display: block;
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
        gem-active-link:where(:state(active), [data-active]) {
          color: ${theme.primaryColor};
        }
        gem-active-link:where(:state(active), [data-active])::after {
          content: '';
          position: absolute;
          left: 0;
          bottom: 0;
          height: 3px;
          background: currentColor;
          width: 100%;
        }
        gem-use {
          width: 1em;
        }
        @media ${mediaQuery.PHONE} {
          gem-book-nav-logo + .item {
            margin-left: 0;
          }
          .internals .item {
            padding: 0 0.3rem;
          }
          .external {
            display: none;
          }
        }
      </style>
      <div class="internals">
        ${this.logo ? html`<gem-book-nav-logo></gem-book-nav-logo>` : ''} ${internals.map(this.renderInternalItem)}
      </div>
      ${externals.map(this.renderExternalItem)} ${githubLink} ${this.renderI18nSelect()}
      <slot class="slot item"></slot>
    `;
  }

  updated() {
    if (this.i18nRef.element && bookStore.lang) {
      // browser history back
      this.i18nRef.element.value = bookStore.lang;
    }
  }
}
