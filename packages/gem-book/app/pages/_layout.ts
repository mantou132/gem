import {
  adoptedStyle,
  classMap,
  connectStore,
  createState,
  css,
  effect,
  GemElement,
  history,
  html,
  memo,
  property,
  template,
} from '@mantou/gem';
import { mediaQuery } from '@mantou/gem/helper/mediaquery';
import { layout } from '@mantou/gemkit';

import { i18n, localizePath } from '$gemkit/i18n';
import { icons } from '../lib/icons';
import { getContent, getSidebar, getVersion, isHomePage } from '../lib/site';
import { htmlTemplate } from '../lib/template';
import { primaryTextColor, theme } from '../lib/theme';
import type { SidebarItem, Site } from '../lib/types';
import { bookStore } from '../plugin';

import '@mantou/gem/elements/link';
import '../elements/comment';
import '../elements/docsearch';

const { title, icon, docsearch, comment } = __GEM_BOOK_CONFIG__;

const style = css`
  :scope {
    display: block;
    color: ${theme.textColor};
    background: ${theme.backgroundColor};
    font-family: ${theme.font};
  }
  a,
  gem-link,
  gem-active-link {
    color: inherit;
    text-decoration: none;
  }
  svg {
    display: block;
    width: 1.25em;
    height: 1.25em;
  }
  header {
    position: sticky;
    top: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    gap: 2rem;
    height: ${theme.headerHeight};
    padding-inline: 1.5rem;
    box-sizing: border-box;
    border-bottom: 1px solid ${theme.borderColor};
    background: rgb(from ${theme.backgroundColor} r g b / 0.85);
    backdrop-filter: blur(12px);
  }
  .slot:empty {
    display: none;
  }
  .menu {
    all: unset;
    display: none;
    cursor: pointer;
  }
  .logo {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1.15rem;
    font-weight: bold;
    white-space: nowrap;
    img {
      height: 2rem;
    }
  }
  .nav {
    display: flex;
    gap: 1.5rem;
    flex-grow: 1;
  }
  .nav-link {
    font-size: 0.9375rem;
    font-weight: 500;
    &:hover,
    &:state(active) {
      color: ${primaryTextColor};
    }
  }
  .actions {
    display: flex;
    align-items: center;
    gap: 1rem;
    color: rgb(from ${theme.textColor} r g b / 0.7);
    > :hover {
      color: ${theme.textColor};
    }
  }
  .text-link {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.9375rem;
    svg {
      width: 0.9em;
    }
  }
  .lang,
  .version {
    position: relative;
    display: flex;
    align-items: center;
    cursor: pointer;
    select {
      position: absolute;
      inset: 0;
      opacity: 0;
      cursor: pointer;
    }
  }
  .version {
    gap: 0.4rem;
    font-size: 0.9375rem;
    svg {
      width: 0.5em;
      height: auto;
      rotate: 90deg;
    }
  }
  .body {
    display: grid;
    grid-template-columns: ${theme.sidebarWidth} minmax(0, 1fr);
  }
  .sidebar {
    position: sticky;
    top: ${theme.headerHeight};
    height: calc(100vh - ${theme.headerHeight});
    padding: 1.5rem 0.75rem;
    box-sizing: border-box;
    overflow: auto;
    overscroll-behavior: contain;
    scrollbar-width: thin;
    font-size: 0.9375rem;
    border-inline-end: 1px solid ${theme.borderColor};
    background: rgb(from ${theme.textColor} r g b / 0.02);
    ul {
      margin: 0;
      padding: 0;
      list-style: none;
    }
    ul ul {
      margin-inline-start: 0.75rem;
      padding-inline-start: 0.5rem;
      border-inline-start: 1px solid ${theme.borderColor};
    }
    /* 顶层的分组之间使用分隔线 */
    > ul > li:has(> details):not(:first-child),
    > ul > li:has(> details) + li {
      margin-top: 0.75rem;
      padding-top: 0.75rem;
      border-top: 1px solid ${theme.borderColor};
    }
    summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.4rem 0.75rem;
      font-weight: 600;
      cursor: pointer;
      list-style: none;
    }
    summary::-webkit-details-marker {
      display: none;
    }
    summary::after {
      content: '';
      width: 0.35em;
      height: 0.35em;
      margin-inline: 0.5em 0.25em;
      border: solid currentColor;
      border-width: 0 1.5px 1.5px 0;
      opacity: 0.5;
      transform: rotate(-45deg);
      transition: transform 0.2s;
    }
    details[open] > summary::after {
      transform: rotate(45deg);
    }
    .link {
      display: block;
      padding: 0.3rem 0.75rem;
      border-radius: ${theme.smallRound};
      color: rgb(from ${theme.textColor} r g b / 0.7);
      &:hover {
        color: ${theme.textColor};
      }
      &.current {
        font-weight: 500;
        color: ${primaryTextColor};
        background: rgb(from ${theme.primaryColor} r g b / 0.12);
      }
    }
    /* 顶层的页面和分组标题一样 */
    > ul > li > .link {
      font-weight: 600;
      &:not(.current) {
        color: ${theme.textColor};
      }
    }
  }
  .mobile-nav {
    display: none;
  }
  main {
    min-width: 0;
    padding: 2.5rem 3rem 0;
  }
  footer {
    margin-top: 4rem;
    padding-block: 2rem;
    font-size: 0.875rem;
    color: rgb(from ${theme.textColor} r g b / 0.5);
    border-top: 1px solid ${theme.borderColor};
    a {
      color: ${theme.textColor};
    }
    p {
      margin: 0;
    }
  }
  /* 首页和没有侧边栏的页面 */
  .full {
    grid-template-columns: minmax(0, 1fr);
    .sidebar {
      display: none;
    }
    footer {
      text-align: center;
    }
  }
  @media not ${`(${mediaQuery.DESKTOP})`} {
    .body:not(.full) {
      grid-template-columns: ${theme.sidebarWidthSmall} minmax(0, 1fr);
    }
    main {
      padding-inline: 2rem;
    }
  }
  @media ${mediaQuery.PHONE} {
    header {
      gap: 1rem;
      padding-inline: 1rem;
    }
    .menu {
      display: flex;
    }
    .nav,
    .text-link {
      display: none;
    }
    .logo {
      flex-grow: 1;
    }
    .body,
    .full {
      display: block;
    }
    .sidebar,
    .full .sidebar {
      display: none;
      position: fixed;
      inset: ${theme.headerHeight} 0 0;
      z-index: 10;
      width: auto;
      height: auto;
      border: none;
      background: ${theme.backgroundColor};
    }
    .full .sidebar.open,
    .sidebar.open {
      display: block;
    }
    .mobile-nav {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
      .nav-link {
        padding: 0.25rem 0.75rem;
        border-radius: 10em;
        background: rgb(from ${theme.primaryColor} r g b / 0.1);
      }
    }
    main {
      padding-inline: 1rem;
    }
  }
`;

@layout()
@adoptedStyle(style)
// 切换语言的链接和侧边栏使用当前路径
@connectStore(history.store)
export default class RootLayout extends GemElement {
  @property data?: Site;

  #state = createState({ menuOpen: false });

  #toggleMenu = () => this.#state({ menuOpen: !this.#state.menuOpen });

  // 切换语言需要重新加载页面
  #changeLanguage = (evt: Event) => {
    location.href = localizePath((evt.target as HTMLSelectElement).value);
  };

  #changeVersion = (evt: Event) => {
    history.push({ path: (evt.target as HTMLSelectElement).value });
  };

  // 在渲染页面中的插件前更新，服务端渲染时也一样
  @memo((i) => [history.getParams().path, i.data])
  #updateBookStore = () => {
    const { path } = history.getParams();
    bookStore({ lang: i18n.currentLanguage, path, version: getVersion(path), site: this.data });
  };

  @effect(() => [history.getParams().path])
  #closeMenu = () => this.#state({ menuOpen: false });

  // 导航可能是目录，目录中的页面都高亮
  #renderNav = (cls: string) =>
    this.data &&
    getContent(this.data, history.getParams().path).nav.map(
      ({ title: navTitle, link }) => html`
        <gem-active-link class=${cls} path=${link} pattern=${link === '/' ? '' : `${link}/*`}>
          ${navTitle}
        </gem-active-link>
      `,
    );

  #renderItems = (items: SidebarItem[]): unknown => html`
    <ul>
      ${items.map(
        ({ title: itemTitle, link, children }) => html`
          <li>
            ${
              children
                ? html`<details open><summary>${itemTitle}</summary>${this.#renderItems(children)}</details>`
                : html`<gem-link class=${classMap({ link: true, current: link === history.getParams().path })} path=${link}>
                    ${itemTitle}
                  </gem-link>`
            }
          </li>
        `,
      )}
    </ul>
  `;

  #renderActions = () => {
    const { links = [], langs = [], versions = [] } = this.data || {};
    const version = getVersion(history.getParams().path);
    return html`
      <div class="actions">
        <label v-if=${!!versions.length} class="version" aria-label=${i18n.get('version')}>
          ${version || i18n.get('latest')} ${icons.arrow}
          <select @change=${this.#changeVersion}>
            <option value="/" ?selected=${!version}>${i18n.get('latest')}</option>
            ${versions.map(({ name }) => html`<option value=${`/${name}`} ?selected=${name === version}>${name}</option>`)}
          </select>
        </label>
        ${links
          .filter((item) => !item.icon)
          .map(
            ({ title: linkTitle, link }) => html`
              <a class="text-link" href=${link} target="_blank">${linkTitle}${icons.link}</a>
            `,
          )}
        <label v-if=${langs.length > 1} class="lang" aria-label=${i18n.get('language')}>
          ${icons.i18n}
          <select @change=${this.#changeLanguage}>
            ${langs.map(
              ({ code, name }) =>
                html`<option value=${code} ?selected=${code === i18n.currentLanguage}>${name}</option>`,
            )}
          </select>
        </label>
        ${links
          .filter((item) => item.icon)
          .map(
            ({ title: linkTitle, link, icon: name }) => html`
              <a href=${link} target="_blank" aria-label=${linkTitle}>${icons[name as keyof typeof icons]}</a>
            `,
          )}
      </div>
    `;
  };

  @template()
  #content = () => {
    const { path } = history.getParams();
    const sidebar = this.data ? getSidebar(getContent(this.data, path), path) : [];
    const { menuOpen } = this.#state;
    return html`
      <header>
        <button class="menu" aria-label=${i18n.get('menu')} aria-expanded=${menuOpen} @click=${this.#toggleMenu}>
          ${menuOpen ? icons.close : icons.menu}
        </button>
        <gem-link class="logo" path="/">
          ${icon ? html`<img src=${icon} alt="" />` : ''}
          <span>${title}</span>
        </gem-link>
        <nav class="nav">${this.#renderNav('nav-link')}</nav>
        ${docsearch ? html`<gbp-docsearch></gbp-docsearch>` : ''}
        <div class="slot" data-gbp-slot="nav-inside"></div>
        ${this.#renderActions()}
      </header>
      <div class=${classMap({ body: true, full: isHomePage(path) || !sidebar.length })}>
        <aside class=${classMap({ sidebar: true, open: menuOpen })}>
          <nav class="mobile-nav">${this.#renderNav('nav-link')}</nav>
          <div class="slot" data-gbp-slot="sidebar-before"></div>
          ${this.#renderItems(sidebar)}
        </aside>
        <main>
          <div class="slot" data-gbp-slot="main-before"></div>
          <gemkit-outlet></gemkit-outlet>
          <div class="slot" data-gbp-slot="main-after"></div>
          ${comment && !isHomePage(path) ? html`<gbp-comment></gbp-comment>` : ''}
          <footer>
            ${
              this.data?.footer
                ? htmlTemplate(this.data.footer)
                : i18n.get('footer', (text) => html`<a href="https://book.gemjs.org" target="_blank">${text}</a>`)
            }
          </footer>
        </main>
      </div>
    `;
  };
}
