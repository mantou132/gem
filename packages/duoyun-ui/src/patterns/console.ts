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

import '../elements/title';
import '../elements/use';
import '../elements/side-navigation';
import '../elements/avatar';
import '../elements/link';

export const locationStore = DuoyunRouteElement.createLocationStore();

export type Routes = RoutesObject | RouteItem[];
export type { NavItems } from '../elements/side-navigation';
export type Menus = ContextMenuItem[];
export type UserInfo = {
  username: string;
  org?: string;
  avatar?: string;
  profile?: string;
};

const style = createCSSSheet(css`
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
    display: block;
    height: 5em;
    width: max-content;
    /* logo must padding */
    margin-inline-start: -0.2em;
    margin-block: 0em 1em;
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
`);

/**
 * @customElement dy-pat-console
 */
@customElement('dy-pat-console')
@adoptedStyle(style)
export class DyPatConsoleElement extends GemElement {
  @boolattribute keyboardAccess: boolean;
  @boolattribute screencastMode: boolean;
  @attribute logo: string;
  @attribute name: string;

  @property routes?: RoutesObject | RouteItem[];
  @property navItems?: NavItems;
  @property menus?: ContextMenuItem[];
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
    ContextMenu.open([...(this.menus || [])].filter(isNotNullish), {
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
        ${this.logo.trim().match(/^(http|[./])/)
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
                  ?hidden=${!this.menus}
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
