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
  history,
  state,
  createCSSSheet,
  css,
  adoptedStyle,
} from '@mantou/gem';
import { mediaQuery } from '@mantou/gem/helper/mediaquery';

import { NavItem } from '../../common/config';
import { theme } from '../helper/theme';
import { capitalize, isSameOrigin } from '../lib/utils';
import { bookStore, updateBookConfig } from '../store';

import { icons } from './icons';
import { sidebarStore, updateSidebarStore } from './sidebar';

import '@mantou/gem/elements/link';
import '@mantou/gem/elements/use';
import './nav-logo';

const styles = createCSSSheet(css`
  :scope {
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
  }
  slot.item {
    gap: 1rem;
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
  .external:not(.icon) {
    padding-inline-end: 0;
  }
  .external:not(.icon) gem-use {
    width: 1em;
    margin-left: 0.3rem;
  }
  :scope(:state(compact)) .external:not(.icon) {
    display: none;
  }
  :scope(:state(compact)) .left .item {
    padding: 0 0.5rem;
  }
  gem-link,
  gem-active-link {
    text-decoration: none;
    color: inherit;
  }
  gem-active-link:not(.icon):active {
    background: rgb(from ${theme.primaryColor} r g b / 0.1);
  }
  gem-active-link:not(.icon):hover,
  gem-active-link:state(active) {
    color: ${theme.primaryColor};
  }
  gem-active-link:state(active)::after {
    content: '';
    position: absolute;
    left: 0;
    bottom: -1px;
    height: 3px;
    background: currentColor;
    width: 100%;
  }
  .icon {
    padding-left: 0.5rem;
    color: rgb(from ${theme.textColor} r g b / 0.6);
  }
  .icon:hover {
    color: rgb(from ${theme.textColor} r g b / 0.8);
  }
  .icon span {
    display: none;
  }
  .icon gem-use {
    width: 1.5em;
  }
  .menu {
    display: none;
    color: rgb(from ${theme.textColor} r g b / 0.8);
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
`);

/**
 * @attr tl
 * @attr icon
 * @attr github
 */
@customElement('gem-book-nav')
@connectStore(bookStore)
@connectStore(sidebarStore)
@adoptedStyle(styles)
export class Nav extends GemElement {
  @boolattribute logo: boolean;

  @globalemitter languagechange = (lang: string) => {
    const { path, query, hash } = history.getParams();
    history.basePath = `/${lang}`;
    history.replace({ path, query, hash });
    updateBookConfig(bookStore.config);
  };

  @state compact: boolean;
  @refobject spaceRef: RefObject<HTMLDivElement>;
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
        <gem-link class=${classMap({ item: true, icon: !!icon, external: true })} href=${link} title=${title}>
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
    const textExternals = externals.filter((e) => !(e.title.toLowerCase() in icons));
    const iconExternals = externals?.filter((e) => e.title.toLowerCase() in icons) || [];

    return html`
      <gem-use
        class="menu"
        @click=${() => updateSidebarStore({ open: !sidebarStore.open })}
        .element=${sidebarStore.open ? icons.close : icons.menu}
      ></gem-use>
      ${this.logo ? html`<gem-book-nav-logo></gem-book-nav-logo>` : ''}
      <div class="left">
        ${internals.map((item) => this.renderInternalItem(item))}
        ${textExternals.map((item) => this.renderExternalItem(item))}
        <div ref=${this.spaceRef.ref} style="flex-grow: 1;"></div>
      </div>
      <slot class="item">${bookStore.slots?.navInside}</slot>
      ${this.renderI18nSelect()}
      ${iconExternals.map((item) => this.renderExternalItem(item, (icons as any)[item.title.toLowerCase()]))}
      ${githubLink}
    `;
  }

  mounted = () => {
    this.effect(() => {
      if (this.i18nRef.element) {
        this.i18nRef.element.value = bookStore.lang!;
      }
      this.compact ||= this.spaceRef.element!.getBoundingClientRect().width < 100;
    });
  };
}
