import { GemElement, html, ifDefined } from '@mantou/gem/lib/element';
import { adoptedStyle, attribute, boolattribute, customElement, property } from '@mantou/gem/lib/decorators';
import { createCSSSheet, css } from '@mantou/gem/lib/utils';
import { mediaQuery } from '@mantou/gem/helper/mediaquery';

import { theme } from '../lib/theme';
import { Loadbar } from '../elements/page-loadbar';
import { commonHandle } from '../lib/hotkeys';
import { icons } from '../lib/icons';
import { isNotNullish } from '../lib/types';
import type { NavItems } from '../elements/side-navigation';
import type { DuoyunUseElement } from '../elements/use';
import { DuoyunRouteElement, RouteItem, RoutesObject } from '../elements/route';
import { ContextMenu, ContextMenuItem } from '../elements/contextmenu';
import { isRemoteIcon } from '../lib/utils';

import '../elements/title';
import '../elements/use';
import '../elements/side-navigation';
import '../elements/avatar';
import '../elements/link';

export const locationStore = DuoyunRouteElement.createLocationStore();

export type Routes<T = unknown> = RoutesObject<T> | RouteItem<T>[];
export type { NavItems } from '../elements/side-navigation';
export type ContextMenus = ContextMenuItem[];
export type UserInfo = {
  username: string;
  org?: string;
  avatar?: string;
  profile?: string;
};

const rules = css`
  dy-pat-console {
    display: flex;
    color: ${theme.textColor};
    background-color: ${theme.backgroundColor};
  }
  dy-pat-console .sidebar {
    position: sticky;
    top: 0;
    flex-shrink: 0;
    display: flex;
    box-sizing: border-box;
    width: 16em;
    height: 100vh;
    flex-direction: column;
    background-color: ${theme.lightBackgroundColor};
    padding: ${theme.gridGutter};
  }
  dy-pat-console .logo {
    align-self: flex-start;
    height: 4em;
    /* logo must padding */
    margin-inline-start: -0.2em;
    margin-block: 0em 2em;
  }
  dy-pat-console .navigation {
    flex-grow: 1;
    margin-block-end: 3em;
  }
  dy-pat-console .user-info {
    font-size: 0.875em;
    display: flex;
    align-items: center;
    gap: 0.5em;
  }
  dy-pat-console .avatar,
  dy-pat-console .menu {
    flex-shrink: 0;
  }
  dy-pat-console .user {
    min-width: 0;
    flex-grow: 1;
    flex-shrink: 1;
    display: flex;
    flex-direction: column;
    line-height: 1.2;
  }
  dy-pat-console .user:not([href]) {
    pointer-events: none;
  }
  dy-pat-console .username {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  dy-pat-console .org {
    font-size: 0.75em;
    font-style: italic;
    color: ${theme.describeColor};
  }
  dy-pat-console .menu {
    width: 1.5em;
    padding: 4px;
    border-radius: ${theme.normalRound};
  }
  dy-pat-console .menu:where(:hover, :state(active), [data-active]) {
    background-color: ${theme.hoverBackgroundColor};
  }
  dy-pat-console .main-container {
    flex-grow: 1;
    min-width: 0;
  }
  dy-pat-console dy-light-route {
    display: contents;
  }
  dy-pat-console .main {
    margin: auto;
    padding: calc(2 * ${theme.gridGutter});
    max-width: 80em;
  }
  dy-pat-console[responsive] {
    @media ${mediaQuery.PHONE_LANDSCAPE} {
      .sidebar {
        width: 4.5em;
        padding: 2em 1em 1em;
      }
      .navigation {
        font-size: 1.3em;
        margin-block-end: 2em;
      }
      .user-info {
        justify-content: center;
      }
      :is(.logo, .avatar, .user) {
        display: none;
      }
    }
  }
`;

// https://bugzilla.mozilla.org/show_bug.cgi?id=1830512
const style = createCSSSheet(
  'CSSScopeRule' in window
    ? `
        @scope (body) to (dy-light-route) {
          ${rules}
        }
      `
    : rules,
);

// 禁止橡皮条
const consoleStyle = createCSSSheet(css`
  ::selection,
  ::target-text {
    color: ${theme.backgroundColor};
    background: ${theme.primaryColor};
  }
  ::highlight(search) {
    color: ${theme.backgroundColor};
    background: ${theme.informativeColor};
  }
  :where(:root) {
    font-family: -apple-system, system-ui, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans',
      'PingFang SC', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji';
    -moz-osx-font-smoothing: grayscale;
    -webkit-font-smoothing: antialiased;
    height: 100%;
    overflow: hidden;
  }
  :where(body) {
    height: 100%;
    overflow: auto;
    overscroll-behavior: none;
    margin: 0;
  }
`);

/**
 * @customElement dy-pat-console
 */
@customElement('dy-pat-console')
@adoptedStyle(style)
@adoptedStyle(consoleStyle)
export class DyPatConsoleElement extends GemElement {
  @boolattribute keyboardAccess: boolean;
  @boolattribute screencastMode: boolean;
  @boolattribute responsive: boolean;
  @attribute name: string;

  @property logo: string | Element | DocumentFragment;
  @property routes?: Routes;
  @property navItems?: NavItems;
  @property contextMenus?: ContextMenus;
  @property userInfo?: UserInfo;

  constructor() {
    super({ isLight: true });
  }

  #onLoading = () => {
    Loadbar.start();
  };

  #onChange = () => {
    Loadbar.end();
  };

  #openMenu = ({ target }: MouseEvent) => {
    const btn = target as DuoyunUseElement;
    ContextMenu.open([...(this.contextMenus || [])].filter(isNotNullish), {
      activeElement: btn,
      width: '16em',
    });
  };

  mounted = () => {
    this.effect(() => {
      this.keyboardAccess && import('../elements/keyboard-access');
      this.screencastMode && import('../elements/input-capture');
    });
  };

  render = () => {
    const avatar =
      this.userInfo?.avatar ||
      `https://api.dicebear.com/7.x/pixel-art/svg?seed=Johnhttps://api.dicebear.com/7.x/pixel-art/svg?seed=${this.userInfo?.username}`;

    return html`
      <dy-title hidden .suffix=${mediaQuery.isPWA ? '' : this.name && ` - ${this.name}`}></dy-title>
      <div class="sidebar">
        ${isRemoteIcon(this.logo)
          ? html`<img class="logo" alt="Logo" src=${this.logo}></img>`
          : html`<dy-use class="logo" .element=${this.logo}></dy-use>`}
        <dy-side-navigation class="navigation" .items=${this.navItems}></dy-side-navigation>
        ${this.userInfo
          ? html`
              <div class="user-info">
                <dy-avatar class="avatar" alt="Avatar" src=${avatar}></dy-avatar>
                <dy-link class="user" href=${ifDefined(this.userInfo.profile)}>
                  <span class="username" aria-label="Username">${this.userInfo.username}</span>
                  <span class="org" aria-label="Org" ?hidden=${!this.userInfo.org}>@${this.userInfo.org}</span>
                </dy-link>
                <dy-use
                  tabindex="0"
                  role="button"
                  aria-label="Preference"
                  class="menu"
                  ?hidden=${!this.contextMenus}
                  @click=${this.#openMenu}
                  @keydown=${commonHandle}
                  .element=${icons.more}
                ></dy-use>
              </div>
            `
          : ''}
      </div>
      <div class="main-container">
        <main class="main" aria-label="Content">
          <dy-light-route
            @loading=${this.#onLoading}
            @routechange=${this.#onChange}
            .routes=${this.routes}
            .locationStore=${locationStore}
            .scrollContainer=${document.body}
          ></dy-light-route>
        </main>
      </div>
      ${this.keyboardAccess ? html`<dy-keyboard-access></dy-keyboard-access>` : ''}
      ${this.screencastMode ? html`<dy-input-capture></dy-input-capture>` : ''}
    `;
  };
}
