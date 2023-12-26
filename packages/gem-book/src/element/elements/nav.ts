import {
  html,
  GemElement,
  customElement,
  refobject,
  RefObject,
  globalemitter,
  connectStore,
  boolattribute,
  classMap,
} from '@mantou/gem';
import { mediaQuery } from '@mantou/gem/helper/mediaquery';

import { NavItem } from '../../common/config';
import { theme } from '../helper/theme';
import { capitalize, isSameOrigin } from '../lib/utils';
import { bookStore } from '../store';

import { icons } from './icons';
import { sidebarStore, toggleSidebar } from './sidebar';

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
@connectStore(sidebarStore)
export class Nav extends GemElement {
  @boolattribute logo: boolean;

  @globalemitter languagechange = (v: string) => bookStore.languagechangeHandle?.(v);

  @refobject i18nRef: RefObject<HTMLSelectElement>;

  renderI18nSelect = () => {
    const { langList = [], lang } = bookStore;
    if (lang) {
      return html`
        <div class="icon item">
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

  renderExternalItem = ({ navTitle, title, link }: NavItem, icon?: string | Element | DocumentFragment) => {
    if (link) {
      return html`
        <gem-link class=${classMap({ item: true, icon: !!icon })} href=${link} title=${title}>
          <span>${capitalize(navTitle || title)}</span>
          <gem-use .element=${icon || icons.link}></gem-use>
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
    const githubLink = config ? this.renderExternalItem({ title: 'github', link: github }, icons.github) : null;
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
        gem-book-nav-logo {
          margin-right: 3rem;
        }
        .item {
          display: flex;
          align-items: center;
          position: relative;
          cursor: pointer;
          overflow: hidden;
        }
        :where(.item + .item) {
          margin-left: 1rem;
        }
        .item select {
          -webkit-appearance: none;
          appearance: none;
          cursor: pointer;
          position: absolute;
          inset: 0;
          opacity: 0;
        }
        .left {
          flex-grow: 1;
          display: flex;
        }
        .left .item {
          padding: 0 1rem;
        }
        gem-link,
        gem-active-link {
          text-decoration: none;
          color: inherit;
        }
        gem-active-link:not(.icon):active {
          background: rgba(${theme.primaryColorRGB}, 0.1);
        }
        gem-active-link:not(.icon):hover,
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
        .item:not(.icon) gem-use {
          width: 1em;
          margin-left: 0.3rem;
        }
        .icon span {
          display: none;
        }
        .icon gem-use {
          opacity: 0.6;
          width: 1.5em;
        }
        .icon:hover gem-use {
          opacity: 0.8;
        }
        .menu {
          display: none;
          opacity: 0.8;
          width: 1.5em;
          padding-inline: 1rem;
          margin-inline-start: -1rem;
        }
        @media ${mediaQuery.PHONE} {
          .menu {
            display: block;
          }
          .left * {
            display: none;
          }
        }
      </style>
      <gem-use class="menu" @click=${toggleSidebar} .element=${sidebarStore.open ? icons.close : icons.menu}></gem-use>
      ${this.logo ? html`<gem-book-nav-logo></gem-book-nav-logo>` : ''}
      <div class="left">
        ${internals.map((item) => this.renderInternalItem(item))}
        ${externals.map((item) => this.renderExternalItem(item))}
      </div>
      <slot class="item"></slot>
      ${this.renderI18nSelect()} ${githubLink}
    `;
  }

  updated() {
    if (this.i18nRef.element && bookStore.lang) {
      // browser history back
      this.i18nRef.element.value = bookStore.lang;
    }
  }
}
