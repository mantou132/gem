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
import { logger } from '@mantou/gem/helper/logger';

import { BookConfig } from '../common/config';
import { UPDATE_EVENT } from '../common/constant';

import { theme, changeTheme, Theme, themeProps } from './helper/theme';
import { bookStore, updateBookConfig, locationStore } from './store';
import { checkBuiltInPlugin, getRemotePath } from './lib/utils';
import { GemBookPluginElement } from './elements/plugin';
import { Loadbar } from './elements/loadbar';
import { Homepage } from './elements/homepage';
import type { Main } from './elements/main';

import '@mantou/gem/elements/title';
import '@mantou/gem/elements/reflect';
import './elements/nav';
import './elements/sidebar';
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

  @part static nav: string;
  @part static sidebar: string;
  @part static main: string;
  @part static editLink: string;
  @part static relLink: string;
  @part static footer: string;
  @part static homepageHero: string;

  @slot static sidebarBefore: string;
  @slot static mainBefore: string;
  @slot static mainAfter: string;
  @slot static navInside: string;
  /**仅侧边栏中 */
  @slot static logoAfter: string;

  @state isHomePage: boolean;

  constructor(config?: BookConfig, theme?: Partial<Theme>) {
    super();
    this.config = config;
    this.theme = theme;
    new MutationObserver(() => checkBuiltInPlugin(this)).observe(this, { childList: true });
    document.currentScript?.addEventListener('load', () => checkBuiltInPlugin(this));
    this.addEventListener('message', ({ detail }: CustomEvent) => {
      const event = JSON.parse(detail);
      if (typeof event.data !== 'object') return;
      if (this.dev) logger.info('Event data', event.data);
      const { filePath, content, config, theme, reload } = event.data;
      if (event.type !== UPDATE_EVENT) return;
      const routeELement = this.routeRef.element!;
      if (reload) {
        location.reload();
      } else if (theme) {
        this.theme = theme;
      } else if (config) {
        this.config = config;
        // 等待路由更新
        queueMicrotask(() => routeELement.update());
      } else if (routeELement.currentRoute?.pattern === '*') {
        routeELement.update();
      } else if (getRemotePath(bookStore.getCurrentLink?.().originLink || '', bookStore.lang) === '/' + filePath) {
        const firstElementChild = routeELement.firstElementChild! as Main;
        firstElementChild.content = content;
      }
    });
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
        slot[name='${GemBookElement.mainBefore}'],
        slot[name='${GemBookElement.mainAfter}'] {
          display: block;
        }
        slot[name='${GemBookElement.mainBefore}'] {
          margin-block-start: 2rem;
        }
        :where(
            slot[name='${GemBookElement.mainBefore}'],
            slot[name='${GemBookElement.mainAfter}'],
            slot[name='${GemBookElement.sidebarBefore}']
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
          :host {
            ${`${themeProps.sidebarWidth}: ${theme.sidebarWidthSmall}`};
          }
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
          slot[name='${GemBookElement.mainBefore}'] {
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
            <gem-book-nav role="navigation" part=${GemBookElement.nav} .logo=${mediaQuery.isPhone || !!renderFullWidth}>
              <slot name=${GemBookElement.navInside}></slot>
            </gem-book-nav>
          `
        : null}
      ${mediaQuery.isPhone || !renderFullWidth
        ? html`
            <gem-book-sidebar role="navigation" part=${GemBookElement.sidebar}>
              <slot slot=${GemBookElement.logoAfter} name=${GemBookElement.logoAfter}></slot>
              <slot name=${GemBookElement.sidebarBefore}></slot>
            </gem-book-sidebar>
          `
        : null}
      ${renderHomePage
        ? html`<gem-book-homepage exportparts="${Homepage.hero}: ${GemBookElement.homepageHero}"></gem-book-homepage>`
        : ''}
      <main>
        ${renderHomePage ? '' : html`<slot name=${GemBookElement.mainBefore}></slot>`}
        <gem-light-route
          ref=${this.routeRef.ref}
          role="main"
          part=${GemBookElement.main}
          .locationStore=${locationStore}
          .key=${lang}
          .routes=${routes}
          @loading=${this.#onLoading}
          @routechange=${this.#onRouteChange}
        ></gem-light-route>
        <gem-book-edit-link role="complementary" part=${GemBookElement.editLink}></gem-book-edit-link>
        <gem-book-rel-link role="navigation" part=${GemBookElement.relLink}></gem-book-rel-link>
        ${renderHomePage ? '' : html`<slot name=${GemBookElement.mainAfter}></slot>`}
        <gem-book-footer role="contentinfo" part=${GemBookElement.footer}></gem-book-footer>
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
