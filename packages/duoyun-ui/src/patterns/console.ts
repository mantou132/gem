import { GemElement, html, createCSSSheet } from '@mantou/gem/lib/element';
import { adoptedStyle, attribute, boolattribute, customElement, property } from '@mantou/gem/lib/decorators';
import { css } from '@mantou/gem/lib/utils';
import { ifDefined } from '@mantou/gem/lib/directives';
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

const style = createCSSSheet(css`
  :scope {
    display: flex;
    color: ${theme.textColor};
    background-color: ${theme.backgroundColor};
  }
  .sidebar {
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
  .logo {
    align-self: flex-start;
    height: 4em;
    /* logo must padding */
    margin-inline-start: -0.2em;
    margin-block: 0em 2em;
  }
  .navigation {
    flex-grow: 1;
    margin-block-end: 3em;
  }
  .user-info {
    font-size: 0.875em;
    display: flex;
    align-items: center;
    gap: 0.5em;
  }
  .avatar,
  .menu {
    flex-shrink: 0;
  }
  .user {
    min-width: 0;
    flex-grow: 1;
    flex-shrink: 1;
    display: flex;
    flex-direction: column;
    line-height: 1.2;
  }
  .user:not([href]) {
    pointer-events: none;
  }
  .username {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .org {
    font-size: 0.75em;
    font-style: italic;
    color: ${theme.describeColor};
  }
  .menu {
    width: 1.5em;
    padding: 4px;
    border-radius: ${theme.normalRound};
  }
  .menu:where(:hover, :state(active)) {
    background-color: ${theme.hoverBackgroundColor};
  }
  .main-container {
    flex-grow: 1;
    min-width: 0;
  }
  .main {
    margin: auto;
    padding: calc(2 * ${theme.gridGutter});
    max-width: 80em;
  }
  dy-light-route {
    display: contents;
  }
  :scope[responsive] {
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
`);

/**
 * @customElement dy-pat-console
 */
@customElement('dy-pat-console')
@adoptedStyle(style)
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
      <main class="main-container">
        <div class="main" aria-label="Content">
          <dy-light-route
            @loading=${this.#onLoading}
            @routechange=${this.#onChange}
            .routes=${this.routes}
            .locationStore=${locationStore}
            .scrollContainer=${document.body}
          ></dy-light-route>
        </div>
      </main>
      ${this.keyboardAccess ? html`<dy-keyboard-access></dy-keyboard-access>` : ''}
      ${this.screencastMode ? html`<dy-input-capture></dy-input-capture>` : ''}

      <style>
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
          font-family: -apple-system, system-ui, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial,
            'Noto Sans', 'PingFang SC', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol',
            'Noto Color Emoji';
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
      </style>
    `;
  };
}
