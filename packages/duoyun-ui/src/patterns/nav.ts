import { mediaQuery } from '@mantou/gem/helper/mediaquery';
import {
  adoptedStyle,
  attribute,
  connectStore,
  customElement,
  effect,
  mounted,
  property,
  state,
} from '@mantou/gem/lib/decorators';
import type { TemplateResult } from '@mantou/gem/lib/element';
import { createState, css, GemElement, html } from '@mantou/gem/lib/element';
import { history } from '@mantou/gem/lib/history';
import { addListener, classMap } from '@mantou/gem/lib/utils';

import { icons } from '../lib/icons';
import { focusStyle } from '../lib/styles';
import { theme } from '../lib/theme';
import { isRemoteIcon } from '../lib/utils';
import type { Links } from './footer';

import '../elements/use';

export type { Links } from './footer';

const style = css`
  :scope {
    display: flex;
    align-items: center;
    gap: 2em;
    background: ${theme.backgroundColor};
    box-shadow: rgba(0, 0, 0, calc(${theme.maskAlpha} - 0.1)) 0px 0px 8px;
  }
  :scope,
  .drawer-brand {
    padding: 0.6em 1em;
  }
  .drawer-brand {
    display: none;
  }
  li {
    list-style: none;
  }
  dy-use:not(.menu) {
    width: 1.2em;
  }
  .menu {
    display: none;
  }
  :where(.brand, .navbar, .navbar-top-link, dy-link) {
    display: flex;
    align-items: center;
  }
  .brand {
    gap: 0.5em;
  }
  .logo {
    height: 2.6em;
  }
  .name {
    font-size: 1.35em;
    opacity: 0.65;
  }
  .navbar {
    gap: 0.5em;
  }
  :where(.nav-list) {
    display: contents;
  }
  .navbar-item-wrap {
    position: relative;
  }
  .navbar-top-link {
    cursor: pointer;
    gap: 0.3em;
    padding-inline: 0.5em;
    line-height: 2.4;
    border-radius: ${theme.normalRound};
    opacity: 0.65;
  }
  .navbar-item-wrap:hover .navbar-top-link {
    background: ${theme.lightBackgroundColor};
  }
  .dropdown {
    display: none;
    position: absolute;
    flex-direction: column;
    gap: 0.3em;
    top: 100%;
    left: 0;
    min-width: max(100%, 10em);
    width: max-content;
    margin: 0;
    padding: 0.5em;
    line-height: 1.7;
    background: ${theme.backgroundColor};
    border-radius: ${theme.normalRound};
    filter: drop-shadow(${theme.borderColor} 0px 0px 1px)
      drop-shadow(rgba(0, 0, 0, calc(${theme.maskAlpha} - 0.1)) 0px 7px 10px);
  }
  :scope:where(:not(:state(switching))) :where(.navbar-item-wrap:where(:hover, :focus-within)) .dropdown {
    display: flex;
  }
  .dropdown dy-link {
    border-radius: ${theme.normalRound};
    padding: 0.5em;
    gap: 0.3em;
    opacity: 0.65;
  }
  .dropdown dy-link:hover {
    background: ${theme.lightBackgroundColor};
  }
`;

const mobileStyle = css(
  mediaQuery.PHONE,
  /*css*/ `
    :scope {
      gap: 1em;
    }
    .drawer-brand {
      display: block;
      position: sticky;
      top: 0;
      background: ${theme.backgroundColor};
      z-index: 1;
      border-block-end: 1px solid ${theme.borderColor};
      margin-block-end: 1em;
    }
    .menu {
      display: block;
      width: 1.5em;
      padding: 0.5em;
      margin: -0.5em;
      border-radius: 10em;
    }
    .navbar:not(.open) {
      display: none;
    }
    .navbar {
      position: fixed;
      z-index: ${theme.popupZIndex};
      inset: 0;
      background: rgba(0, 0, 0, calc(${theme.maskAlpha}));
      align-items: stretch;
    }
    .nav-list {
      display: block;
      width: 20em;
      height: 100%;
      margin: 0;
      padding: 0;
      background: ${theme.backgroundColor};
      overflow: auto;
      overscroll-behavior: none;
    }
    .nav-list > li {
      padding-inline: 1em;
    }
    .nav-list > li:last-of-type {
      margin-block-end: 3em;
    }
    .open-dropdown + .dropdown {
      display: block;
      padding-inline-start: 2em;
    }
    .dropdown {
      position: relative;
      display: none;
      width: 100%;
      box-sizing: border-box;
      padding: 0;
      min-width: auto;
      filter: none;
    }
    .dropdown::before {
      position: absolute;
      content: '';
      width: 1px;
      height: 100%;
      left: 1.2em;
      top: 0;
      background: ${theme.borderColor};
    }
  `,
);

@customElement('dy-pat-nav')
@adoptedStyle(style)
@adoptedStyle(mobileStyle)
@adoptedStyle(focusStyle)
@connectStore(history.store)
export class DyPatNavElement extends GemElement {
  @attribute name: string;
  @property links?: Links;
  @property logo?: string | Element | DocumentFragment;
  @state switching: boolean;

  navSlot?: TemplateResult;

  #state = createState({
    drawerOpen: false,
  });

  #onMobileItemClick = (evt: MouseEvent) => {
    (evt.currentTarget as HTMLLIElement).classList.toggle('open-dropdown');
  };

  #isOutwardLink(href: string) {
    return new URL(href, location.origin).origin !== location.origin;
  }

  #renderBrand = () => {
    return html`
      <dy-link class="brand" title=${this.name} href="/">
        ${
          !this.logo
            ? ''
            : isRemoteIcon(this.logo)
              ? html`<img class="logo" alt="Logo" src=${this.logo}></img>`
              : html`<dy-use class="logo" aria-label="Logo" .element=${this.logo}></dy-use>`
        }
        <span class="name">${this.name}</span>
      </dy-link>
    `;
  };

  @effect(() => [location.href])
  #blur = () => {
    this.#state({ drawerOpen: false });
    (this.getRootNode() as any).activeElement?.blur();
    this.switching = true;
    setTimeout(() => (this.switching = false), 60);
  };

  @mounted()
  #autoBlur = () => {
    return addListener(document, 'visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.#blur();
      }
    });
  };

  render = () => {
    return html`
      <dy-use
        class="menu"
        tabindex="0"
        .element=${icons.menu}
        @click=${() => this.#state({ drawerOpen: true })}
      ></dy-use>

      ${this.#renderBrand()}

      <nav class=${classMap({ navbar: true, open: this.#state.drawerOpen })}>
        <ul class="nav-list">
          <li class="drawer-brand">${this.#renderBrand()}</li>

          ${this.links?.map(
            ({ label, items, href }) => html`
              <li class="navbar-item-wrap">
              <dy-active-link
                v-if=${!!href}
                @click=${this.#onMobileItemClick}
                tabindex="0"
                class="navbar-top-link"
                href=${href!}
                >${label}</dy-active-link
              >
              <div v-else @click=${this.#onMobileItemClick} tabindex="0" class="navbar-top-link">
                ${label}<dy-use .element=${icons.expand}></dy-use>
              </div>
                <ul v-if=${!!items} class="dropdown">
                  ${items?.map(
                    (item) => html`
                      <li>
                        <dy-link href=${item.href}>
                          ${item.label}
                          <dy-use
                            v-if=${this.#isOutwardLink(item.href)}
                            class="outward"
                            .element=${icons.outward}
                          ></dy-use>
                        </dy-link>
                      </li>
                    `,
                  )}
                </ul>
              </li>
            `,
          )}
        </ul>

        <div style="flex-grow: 1" @click=${() => this.#state({ drawerOpen: false })}></div>
      </nav>

      ${this.navSlot}
    `;
  };
}
