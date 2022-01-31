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
} from '@mantou/gem';
import { GemLightRouteElement } from '@mantou/gem/elements/route';
import { mediaQuery } from '@mantou/gem/helper/mediaquery';

import { BookConfig } from '../common/config';

import { GemBookPluginElement } from './elements/plugin';
import { theme, changeTheme, Theme } from './helper/theme';
import { bookStore, updateBookConfig, locationStore } from './store';

import '@mantou/gem/elements/title';
import '@mantou/gem/elements/reflect';
import './elements/nav';
import './elements/sidebar';
import './elements/homepage';
import './elements/footer';
import './elements/edit-link';
import './elements/rel-link';
import './elements/meta';

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

  @property config: BookConfig | undefined;
  @property theme: Partial<Theme> | undefined;

  @globalemitter routechange: Emitter<null>;

  @part nav: string;
  @part navShadow: string;
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
  }

  changeTheme(newTheme?: Partial<Theme>) {
    return changeTheme(newTheme);
  }

  #onRouteChange = (e: CustomEvent) => {
    document.body.scroll(0, 0);
    this.routechange(e.detail);
  };

  render() {
    const { config, nav = [], routes = [], lang = '', homePage = '', currentSidebar } = bookStore;
    if (!config) return null;

    const { icon = '', title = '', homeMode } = config;
    const hasNavbar = icon || title || nav.length;
    this.isHomePage = homePage === history.getParams().path;
    const renderHomePage = homeMode && this.isHomePage;
    const onlyHomepage = homeMode && currentSidebar?.every((e) => e.link === homePage);
    const renderFullWidth = renderHomePage || onlyHomepage;

    return html`
      <style>
        :host {
          display: grid;
          grid-template-areas: 'left aside content right';
          grid-template-columns: auto ${theme.sidebarWidth} minmax(0, ${theme.mainWidth}) auto;
          grid-template-rows: repeat(44, auto);
          grid-column-gap: 3rem;
          text-rendering: optimizeLegibility;
          font: 16px/1.7 ${theme.font};
          color: ${theme.textColor};
          -webkit-tap-highlight-color: rgba(0, 0, 0, 0);
          background: ${theme.backgroundColor};
        }
        .nav-shadow {
          grid-area: 1 / left / 2 / right;
          background: ${theme.backgroundColor};
          border-bottom: 1px solid ${theme.borderColor};
          box-shadow: 0 0 1.5rem #00000015;
        }
        .nav-shadow,
        gem-book-nav {
          position: sticky;
          top: 0;
          z-index: 3;
        }
        .nav-shadow ~ gem-book-sidebar {
          margin-top: ${theme.headerHeight};
          top: ${theme.headerHeight};
          max-height: calc(100vh - ${theme.headerHeight});
        }
        gem-book-sidebar {
          grid-area: 1 / aside / -1 / aside;
          max-height: 100vh;
        }
        gem-book-nav {
          grid-area: 1 / aside / 2 / content;
        }
        gem-light-route,
        gem-book-edit-link,
        gem-book-rel-link,
        gem-book-footer,
        slot[name='${this.mainBefore}'],
        slot[name='${this.mainAfter}'] {
          grid-area: auto / content;
        }
        slot[name='${this.mainBefore}'],
        slot[name='${this.mainAfter}'] {
          display: block;
          grid-area: auto / content;
        }
        slot[name='${this.mainBefore}'] {
          margin-top: 3rem;
        }
        gem-light-route {
          min-height: 100vh;
        }
        @media ${renderFullWidth ? 'all' : 'not all'} {
          gem-light-route {
            display: flex;
            justify-content: center;
          }
          gem-book-main {
            max-width: min(calc(${theme.sidebarWidth} + ${theme.mainWidth}), 100vw);
          }
          gem-book-homepage {
            grid-area: auto / left / auto / right;
          }
          gem-light-route,
          gem-book-footer {
            grid-area: auto / aside / auto / content;
          }
          gem-book-sidebar,
          gem-book-edit-link,
          gem-book-rel-link {
            display: none;
          }
          gem-book-footer {
            text-align: center;
          }
        }
        @media ${mediaQuery.PHONE} {
          .nav-shadow ~ gem-book-sidebar {
            margin-top: 0;
            height: auto;
          }
          slot[name='${this.mainBefore}'] {
            margin-top: 1rem;
          }
          :host {
            grid-column-gap: 1rem;
            grid-template-areas: 'left content right';
            grid-template-columns: 0 minmax(0, 1fr) auto;
          }
          gem-book-sidebar,
          gem-book-edit-link,
          gem-book-rel-link,
          gem-book-footer,
          gem-light-route {
            grid-area: auto / content;
          }
          gem-book-nav {
            grid-area: 1 / content / 2 / content;
          }
          gem-book-footer {
            text-align: left;
          }
        }
        @media print {
          :host {
            display: block;
          }
          .nav-shadow,
          gem-book-nav,
          gem-book-sidebar,
          gem-book-edit-link,
          gem-book-rel-link,
          gem-book-footer,
          slot[name] {
            display: none;
          }
          gem-light-route {
            grid-area: auto / left / auto / right;
          }
        }
      </style>
      <gem-book-meta aria-hidden="true"></gem-book-meta>
      ${hasNavbar
        ? html`
            <div class="nav-shadow" part=${this.navShadow}></div>
            <gem-book-nav role="navigation" part=${this.nav}>
              <slot name=${this.navInside}></slot>
            </gem-book-nav>
          `
        : null}
      ${renderHomePage
        ? html`<gem-book-homepage exportparts="hero: ${this.homepageHero}"></gem-book-homepage>`
        : html`<slot name=${this.mainBefore}></slot>`}
      <gem-light-route
        ref=${this.routeRef.ref}
        role="main"
        part=${this.main}
        .locationStore=${locationStore}
        .key=${lang}
        .routes=${routes}
        @routechange=${this.#onRouteChange}
      ></gem-light-route>
      <gem-book-edit-link role="complementary" part=${this.editLink}></gem-book-edit-link>
      <gem-book-sidebar role="navigation" part=${this.sidebar}>
        <slot name=${this.sidebarBefore}></slot>
      </gem-book-sidebar>
      <gem-book-rel-link role="navigation" part=${this.relLink}></gem-book-rel-link>
      ${renderHomePage ? '' : html`<slot name=${this.mainAfter}></slot>`}
      <gem-book-footer role="contentinfo" part=${this.footer}></gem-book-footer>
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
