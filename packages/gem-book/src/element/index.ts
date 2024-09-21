import type { Emitter } from '@mantou/gem';
import {
  html,
  GemElement,
  customElement,
  property,
  attribute,
  connectStore,
  part,
  slot,
  globalemitter,
  state,
  createRef,
  boolattribute,
  css,
  adoptedStyle,
  createCSSSheet,
  kebabToCamelCase,
  willMount,
  effect,
} from '@mantou/gem';
import type { GemLightRouteElement } from '@mantou/gem/elements/route';
import { matchPath } from '@mantou/gem/elements/route';
import { mediaQuery } from '@mantou/gem/helper/mediaquery';
import { logger } from '@mantou/gem/helper/logger';

import type { BookConfig } from '../common/config';
import { UPDATE_EVENT } from '../common/constant';

import type { Theme } from './helper/theme';
import { theme, changeTheme, themeProps } from './helper/theme';
import { bookStore, updateBookConfig, locationStore, updateBookStore } from './store';
import { checkBuiltInPlugin, joinPath } from './lib/utils';
import { GemBookPluginElement } from './elements/plugin';
import { Loadbar } from './elements/loadbar';
import type { Main } from './elements/main';

import '@mantou/gem/elements/reflect';
import './elements/homepage';
import './elements/sidebar';
import './elements/nav';
import './elements/footer';
import './elements/edit-link';
import './elements/rel-link';
import './elements/meta';
import './elements/toc';

const styles = createCSSSheet(css`
  :scope {
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
    padding: 2rem 2rem 0;
    min-width: 0;
    grid-area: auto / content;
    box-sizing: border-box;
  }
  slot {
    display: block;
  }
  slot > * {
    margin-block-end: 2rem;
  }
  gem-light-route {
    min-height: 100vh;
  }
  gem-book-toc {
    grid-area: auto / toc;
  }
  @media not ${`(${mediaQuery.DESKTOP})`} {
    :scope {
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
  :scope:state(render-full-width) {
    gem-book-nav {
      grid-area: 1 / aside / 2 / toc;
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
    :scope {
      display: block;
    }
    gem-book-nav,
    main {
      padding-inline: 1rem;
    }
    gem-book-footer {
      text-align: left;
    }
  }
  @media print {
    :scope {
      display: block;

      main {
        width: 100%;
      }
      gem-book-nav,
      gem-book-sidebar,
      gem-book-edit-link,
      gem-book-rel-link,
      gem-book-footer,
      slot {
        display: none;
      }
    }
  }
`);

/**
 * @custom-element gem-book
 * @prop {BookConfig} config
 * @prop {Theme} theme
 * @attr src
 */
@customElement('gem-book')
@connectStore(bookStore)
@adoptedStyle(styles)
export class GemBookElement extends GemElement {
  static GemBookPluginElement = GemBookPluginElement;

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
  @part static sidebarContent: string;
  @part static sidebarLogo: string;

  @slot static sidebarBefore: string;
  @slot static mainBefore: string;
  @slot static mainAfter: string;
  @slot static navInside: string;
  /**仅侧边栏中 */
  @slot static logoAfter: string;

  @state isHomePage: boolean;
  @state renderFullWidth: boolean;

  constructor(config?: BookConfig, customTheme?: Partial<Theme>) {
    super();
    this.config = config;
    this.theme = customTheme;
    new MutationObserver(() => checkBuiltInPlugin(this)).observe(this, { childList: true });
    document.currentScript?.addEventListener('load', () => checkBuiltInPlugin(this));
    this.addEventListener('message', ({ detail }: CustomEvent) => {
      const event = JSON.parse(detail);
      if (typeof event.data !== 'object') return;
      if (this.dev) logger.info('Event data', event.data);
      const { filePath, content, config: newConfig, theme: newTheme, reload } = event.data;
      if (event.type !== UPDATE_EVENT) return;
      const routeELement = this.routeRef.element!;
      const mainElement = routeELement.firstElementChild! as Main;
      if (reload) {
        location.reload();
      } else if (newTheme) {
        this.theme = newTheme;
      } else if (newConfig) {
        this.config = newConfig;
        // 等待路由更新
        queueMicrotask(() => routeELement.update());
      } else if (routeELement.currentRoute?.pattern === '*') {
        routeELement.update();
      } else if (joinPath(bookStore.lang, bookStore.getCurrentLink?.()?.originLink) === `/${filePath}`) {
        mainElement.content = content;
      } else {
        const filename = filePath?.split('/').pop();
        // 支持非所有 [src=*.md] 元素
        mainElement.querySelectorAll(`[src*="${filename}"]`).forEach((ele) => {
          (ele as any).src += `?`;
        });
      }
    });
  }

  @willMount()
  #initUpdateStore = () => {
    updateBookStore({
      slots: Object.fromEntries(
        [...this.querySelectorAll(':scope > [slot]')].map((ele: Element) => [kebabToCamelCase(ele.slot), ele]),
      ),
    });
  };

  #onLoading = () => {
    Loadbar.start();
  };

  #onRouteChange = () => {
    Loadbar.end();
    this.routechange(null);
  };

  @effect((i) => [i.src])
  #updateRemoteConfig = async () => {
    if (!this.src) return;
    const config = await (await fetch(this.src)).json();
    updateBookConfig(config, this);
  };

  @effect((i) => [i.config])
  #updateConfig = () => updateBookConfig(this.config, this);

  @effect((i) => [i.theme])
  #updateTheme = () => changeTheme(this.theme);

  render() {
    const { config, nav = [], routes = [], lang = '', homePage = '', currentSidebar } = bookStore;
    if (!config) return null;

    const { icon = '', title = '', homeMode } = config;
    const hasNavbar = icon || title || nav.length;
    const renderHomePage = !!homeMode && homePage === locationStore.path;
    const missSidebar = homeMode ? !!currentSidebar?.every((e) => e.link === homePage) : !currentSidebar?.length;
    // 首次渲染
    const isRedirectRoute = routes.find(({ pattern }) => matchPath(pattern, locationStore.path))?.redirect;

    this.renderFullWidth = renderHomePage || (missSidebar && !isRedirectRoute);
    this.isHomePage = !!renderHomePage;

    return html`
      <gem-book-meta></gem-book-meta>
      ${hasNavbar
        ? html`
            <gem-book-nav part=${GemBookElement.nav} .logo=${mediaQuery.isPhone || this.renderFullWidth}></gem-book-nav>
          `
        : null}
      ${mediaQuery.isPhone || !this.renderFullWidth
        ? html`<gem-book-sidebar part=${GemBookElement.sidebar}></gem-book-sidebar>`
        : null}
      ${renderHomePage ? html`<gem-book-homepage></gem-book-homepage>` : ''}
      <main>
        ${renderHomePage ? '' : html`<slot name=${GemBookElement.mainBefore}>${bookStore.slots?.mainBefore}</slot>`}
        <gem-light-route
          ref=${this.routeRef.ref}
          role="main"
          part=${GemBookElement.main}
          .locationStore=${locationStore}
          .key=${lang}
          .routes=${routes}
          .scrollContainer=${document.body}
          @loading=${this.#onLoading}
          @routechange=${this.#onRouteChange}
        ></gem-light-route>
        <gem-book-edit-link part=${GemBookElement.editLink}></gem-book-edit-link>
        <gem-book-rel-link part=${GemBookElement.relLink}></gem-book-rel-link>
        ${renderHomePage ? '' : html`<slot name=${GemBookElement.mainAfter}>${bookStore.slots?.mainAfter}</slot>`}
        <gem-book-footer part=${GemBookElement.footer}></gem-book-footer>
      </main>
      <gem-book-toc></gem-book-toc>
    `;
  }

  changeTheme = changeTheme;

  routeRef = createRef<GemLightRouteElement>();
}
