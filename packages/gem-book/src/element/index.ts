import {
  html,
  GemElement,
  customElement,
  property,
  attribute,
  connectStore,
  history,
  Emitter,
  part,
  slot,
  globalemitter,
  state,
  refobject,
  RefObject,
  boolattribute,
} from '@mantou/gem';
import { GemLightRouteElement, matchPath } from '@mantou/gem/elements/route';
import { mediaQuery } from '@mantou/gem/helper/mediaquery';

import { BookConfig } from '../common/config';

import { GemBookPluginElement } from './elements/plugin';
import { theme, changeTheme, Theme } from './helper/theme';
import { bookStore, updateBookConfig, locationStore } from './store';
import { Loadbar } from './elements/loadbar';
import { checkBuiltInPlugin } from './lib/utils';

import '@mantou/gem/elements/title';
import '@mantou/gem/elements/reflect';
import './elements/nav';
import './elements/sidebar';
import './elements/homepage';
import './elements/footer';
import './elements/edit-link';
import './elements/rel-link';
import './elements/meta';
import './elements/toc';

/**
 * @custom-element gem-book
 * @prop {BookConfig} config
 * @prop {Theme} theme
 * @attr src
 */
@customElement('gem-book')
@connectStore(bookStore)
export class GemBookElement extends GemElement {
  static GemBookPluginElement = GemBookPluginElement;

  @refobject routeRef: RefObject<GemLightRouteElement>;

  @attribute src: string;
  // process.env.DEV_MODE 只能用于 website 模式，不能用在单元素中
  @boolattribute dev: boolean;

  @property config: BookConfig | undefined;
  @property theme: Partial<Theme> | undefined;

  @globalemitter routechange: Emitter<null>;

  @part nav: string;
  @part sidebar: string;
  @part main: string;
  @part editLink: string;
  @part relLink: string;
  @part footer: string;
  @part homepageHero: string;

  @slot sidebarBefore: string;
  @slot mainBefore: string;
  @slot mainAfter: string;
  @slot navInside: string;

  @state isHomePage: boolean;

  constructor(config?: BookConfig, theme?: Partial<Theme>) {
    super();
    this.config = config;
    this.theme = theme;
    new MutationObserver(() => checkBuiltInPlugin(this)).observe(this, { childList: true });
    document.currentScript?.addEventListener('load', () => checkBuiltInPlugin(this));
  }

  changeTheme(newTheme?: Partial<Theme>) {
    return changeTheme(newTheme);
  }

  #onLoading = () => {
    Loadbar.start();
  };

  #onRouteChange = (e: CustomEvent) => {
    Loadbar.end();
    document.body.scroll(0, 0);
    this.routechange(e.detail);
  };

  render() {
    const { config, nav = [], routes = [], lang = '', homePage = '', currentSidebar } = bookStore;
    if (!config) return null;

    const { icon = '', title = '', homeMode } = config;
    const { path } = history.getParams();
    const hasNavbar = icon || title || nav.length;
    const renderHomePage = homeMode && homePage === path;
    const missSidebar = homeMode ? currentSidebar?.every((e) => e.link === homePage) : !currentSidebar?.length;
    // 首次渲染
    const isRedirectRoute = routes.find(({ pattern }) => matchPath(pattern, path))?.redirect;
    const renderFullWidth = renderHomePage || (missSidebar && !isRedirectRoute);

    this.isHomePage = !!renderHomePage;

    return html`
      <style>
        :host {
          display: grid;
          grid-template-areas: 'aside content toc';
          grid-template-columns: ${theme.sidebarWidth} 1fr minmax(0, ${theme.sidebarWidth});
          grid-template-rows: repeat(44, auto);
          text-rendering: optimizeLegibility;
          font: 16px/1.8 ${theme.font};
          color: ${theme.textColor};
          -webkit-tap-highlight-color: rgba(0, 0, 0, 0);
          background: ${theme.backgroundColor};
        }
        gem-book-nav {
          position: sticky;
          top: 0;
          z-index: 3;
          grid-area: 1 / content / 2 / toc;
          background: ${theme.backgroundColor};
          padding-inline: 2rem;
        }
        gem-book-sidebar {
          grid-area: 1 / aside / -1 / aside;
        }
        main {
          display: flex;
          flex-direction: column;
          width: min(100%, ${theme.maxMainWidth});
          margin: auto;
          min-width: 0;
          grid-area: auto / content;
          box-sizing: border-box;
          padding-inline: 2rem;
        }
        slot[name='${this.mainBefore}'],
        slot[name='${this.mainAfter}'] {
          display: block;
        }
        slot[name='${this.mainBefore}'] {
          margin-block-start: 2rem;
        }
        :where(
            slot[name='${this.mainBefore}'],
            slot[name='${this.mainAfter}'],
            slot[name='${this.sidebarBefore}']
          )::slotted(*) {
          margin-block-end: 2rem;
        }
        gem-light-route {
          min-height: 100vh;
        }
        gem-book-toc {
          grid-area: auto / toc;
        }
        @media not ${`(${mediaQuery.DESKTOP})`} {
          gem-book-toc {
            display: none;
          }
        }
        @media ${mediaQuery.TABLET} {
          main {
            grid-area: auto / content / auto / toc;
          }
        }
        /* 404, homepage */
        @media ${renderFullWidth ? 'all' : 'not all'} {
          gem-book-nav {
            grid-area: 1 / aside / 2 / toc;
            box-shadow: 0 0 1.5rem #00000015;
          }
          gem-book-homepage,
          main {
            grid-area: auto / aside / auto / toc;
          }
          gem-book-edit-link,
          gem-book-rel-link {
            display: none;
          }
          gem-book-footer {
            text-align: center;
          }
          gem-book-toc {
            display: none;
          }
        }
        @media ${mediaQuery.PHONE} {
          :host {
            display: block;
          }
          gem-book-nav,
          main {
            padding-inline: 1rem;
          }
          slot[name='${this.mainBefore}'] {
            margin-top: 1rem;
          }
          gem-book-footer {
            text-align: left;
          }
        }
        @media print {
          :host {
            display: block;
          }
          main {
            width: 100%;
          }
          gem-book-nav,
          gem-book-sidebar,
          gem-book-edit-link,
          gem-book-rel-link,
          gem-book-footer,
          slot[name] {
            display: none;
          }
        }
      </style>
      <gem-book-meta aria-hidden="true"></gem-book-meta>

      ${hasNavbar
        ? html`
            <gem-book-nav role="navigation" part=${this.nav} .logo=${mediaQuery.isPhone || !!renderFullWidth}>
              <slot name=${this.navInside}></slot>
            </gem-book-nav>
          `
        : null}
      ${mediaQuery.isPhone || !renderFullWidth
        ? html`
            <gem-book-sidebar role="navigation" part=${this.sidebar}>
              <slot name=${this.sidebarBefore}></slot>
            </gem-book-sidebar>
          `
        : null}
      ${renderHomePage ? html`<gem-book-homepage exportparts="hero: ${this.homepageHero}"></gem-book-homepage>` : ''}
      <main>
        ${renderHomePage ? '' : html`<slot name=${this.mainBefore}></slot>`}
        <gem-light-route
          ref=${this.routeRef.ref}
          role="main"
          part=${this.main}
          .locationStore=${locationStore}
          .key=${lang}
          .routes=${routes}
          @loading=${this.#onLoading}
          @routechange=${this.#onRouteChange}
        ></gem-light-route>
        <gem-book-edit-link role="complementary" part=${this.editLink}></gem-book-edit-link>
        <gem-book-rel-link role="navigation" part=${this.relLink}></gem-book-rel-link>
        ${renderHomePage ? '' : html`<slot name=${this.mainAfter}></slot>`}
        <gem-book-footer role="contentinfo" part=${this.footer}></gem-book-footer>
      </main>
      <gem-book-toc></gem-book-toc>
    `;
  }

  mounted() {
    this.effect(
      async () => {
        if (this.src) {
          const config = await (await fetch(this.src)).json();
          updateBookConfig(config, this);
        }
      },
      () => [this.src],
    );
    this.effect(
      () => {
        if (this.config) {
          updateBookConfig(this.config, this);
        }
      },
      () => [this.config],
    );
    this.effect(
      () => {
        changeTheme(this.theme);
      },
      () => [this.theme],
    );
  }
}
