import { history } from '@mantou/gem/lib/history';
import { GemElement, TemplateResult, html, render } from '@mantou/gem/lib/element';
import {
  adoptedStyle,
  attribute,
  connectStore,
  customElement,
  property,
  state,
  shadow,
} from '@mantou/gem/lib/decorators';
import { addListener, classMap, createCSSSheet, css } from '@mantou/gem/lib/utils';
import { mediaQuery } from '@mantou/gem/helper/mediaquery';

import { isRemoteIcon } from '../lib/utils';
import { icons } from '../lib/icons';
import { theme } from '../lib/theme';
import { focusStyle } from '../lib/styles';

import { Links } from './footer';

import '../elements/use';

export type { Links } from './footer';

const style = createCSSSheet(css`
  dy-pat-nav {
    display: flex;
    align-items: center;
    gap: 2em;
    background: ${theme.backgroundColor};
    box-shadow: rgba(0, 0, 0, calc(${theme.maskAlpha} - 0.1)) 0px 0px 8px;
  }
  dy-pat-nav,
  dy-pat-nav .drawer-brand {
    padding: 0.6em 1em;
  }
  dy-pat-nav .drawer-brand {
    display: none;
  }
  dy-pat-nav li {
    list-style: none;
  }
  dy-pat-nav dy-use:not(.menu) {
    width: 1.2em;
  }
  dy-pat-nav .menu {
    display: none;
  }
  dy-pat-nav :where(.brand, .navbar, .navbar-top-link, dy-link) {
    display: flex;
    align-items: center;
  }
  dy-pat-nav .brand {
    gap: 0.5em;
  }
  dy-pat-nav .logo {
    height: 2.6em;
  }
  dy-pat-nav .name {
    font-size: 1.35em;
    opacity: 0.65;
  }
  dy-pat-nav .navbar {
    gap: 0.5em;
  }
  dy-pat-nav :where(.nav-list) {
    display: contents;
  }
  dy-pat-nav .navbar-item-wrap {
    position: relative;
  }
  dy-pat-nav .navbar-top-link {
    cursor: pointer;
    gap: 0.3em;
    padding-inline: 0.5em;
    line-height: 2.4;
    border-radius: ${theme.normalRound};
    opacity: 0.65;
  }
  dy-pat-nav .navbar-item-wrap:hover .navbar-top-link {
    background: ${theme.lightBackgroundColor};
  }
  dy-pat-nav .dropdown {
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
  dy-pat-nav:where(:not(:state(switching))) :where(.navbar-item-wrap:where(:hover, :focus-within)) .dropdown {
    display: flex;
  }
  dy-pat-nav .dropdown dy-link {
    border-radius: ${theme.normalRound};
    padding: 0.5em;
    gap: 0.3em;
    opacity: 0.65;
  }
  dy-pat-nav .dropdown dy-link:hover {
    background: ${theme.lightBackgroundColor};
  }
`);

const mobileStyle = createCSSSheet(
  css`
    dy-pat-nav {
      gap: 1em;
    }
    dy-pat-nav .drawer-brand {
      display: block;
      position: sticky;
      top: 0;
      background: ${theme.backgroundColor};
      z-index: 1;
      border-block-end: 1px solid ${theme.borderColor};
      margin-block-end: 1em;
    }
    dy-pat-nav .menu {
      display: block;
      width: 1.5em;
      padding: 0.5em;
      margin: -0.5em;
      border-radius: 10em;
    }
    dy-pat-nav .navbar:not(.open) {
      display: none;
    }
    dy-pat-nav .navbar {
      position: fixed;
      z-index: ${theme.popupZIndex};
      inset: 0;
      background: rgba(0, 0, 0, calc(${theme.maskAlpha}));
      align-items: stretch;
    }
    dy-pat-nav .nav-list {
      display: block;
      width: 20em;
      height: 100%;
      margin: 0;
      padding: 0;
      background: ${theme.backgroundColor};
      overflow: auto;
      overscroll-behavior: none;
    }
    dy-pat-nav .nav-list > li {
      padding-inline: 1em;
    }
    dy-pat-nav .nav-list > li:last-of-type {
      margin-block-end: 3em;
    }
    dy-pat-nav .open-dropdown + .dropdown {
      display: block;
      padding-inline-start: 2em;
    }
    dy-pat-nav .dropdown {
      position: relative;
      display: none;
      width: 100%;
      box-sizing: border-box;
      padding: 0;
      min-width: auto;
      filter: none;
    }
    dy-pat-nav .dropdown::before {
      position: absolute;
      content: '';
      width: 1px;
      height: 100%;
      left: 1.2em;
      top: 0;
      background: ${theme.borderColor};
    }
  `,
  `${mediaQuery.PHONE}`,
);

type State = {
  drawerOpen: boolean;
};

/**
 * @customElement dy-pat-nav
 */
@customElement('dy-pat-nav')
@adoptedStyle(mobileStyle)
@adoptedStyle(style)
@adoptedStyle(focusStyle)
@connectStore(history.store)
@shadow({ mode: null })
export class DyPatNavElement extends GemElement<State> {
  @attribute name: string;
  @property links?: Links;
  @property logo?: string | Element | DocumentFragment;
  @property renderSlot?: (ele: Element) => TemplateResult | undefined;

  @state switching: boolean;

  constructor() {
    super();
    const blur = () => {
      this.setState({ drawerOpen: false });
      (this.getRootNode() as any).activeElement?.blur();
      this.switching = true;
      setTimeout(() => (this.switching = false), 60);
    };
    this.effect(
      () => blur(),
      () => [location.href],
    );
    this.effect(
      () => {
        return addListener(document, 'visibilitychange', () => {
          if (document.visibilityState === 'hidden') {
            blur();
          }
        });
      },
      () => [],
    );
  }

  state: State = {
    drawerOpen: false,
  };

  #navSlot = document.createElement('div');

  #onMobileItemClick = (evt: MouseEvent) => {
    (evt.currentTarget as HTMLLIElement).classList.toggle('open-dropdown');
  };

  #isOutwardLink(href: string) {
    return new URL(href, location.origin).origin !== location.origin;
  }

  #renderBrand = () => {
    return html`
      <dy-link class="brand" title=${this.name} href="/">
        ${!this.logo
          ? ''
          : isRemoteIcon(this.logo)
            ? html`<img class="logo" alt="Logo" src=${this.logo}></img>`
            : html`<dy-use class="logo" aria-label="Logo" .element=${this.logo}></dy-use>`}
        <span class="name">${this.name}</span>
      </dy-link>
    `;
  };

  render = () => {
    render(this.renderSlot ? this.renderSlot(this.#navSlot) : html``, this.#navSlot);

    return html`
      <dy-use
        class="menu"
        tabindex="0"
        .element=${icons.menu}
        @click=${() => this.setState({ drawerOpen: true })}
      ></dy-use>

      ${this.#renderBrand()}

      <nav class=${classMap({ navbar: true, open: this.state.drawerOpen })}>
        <ul class="nav-list">
          <li class="drawer-brand">${this.#renderBrand()}</li>

          ${this.links?.map(
            ({ label, items, href }) => html`
              <li class="navbar-item-wrap">
                ${href
                  ? html`
                      <dy-active-link
                        @click=${this.#onMobileItemClick}
                        tabindex="0"
                        class="navbar-top-link"
                        href=${href}
                        >${label}</dy-active-link
                      >
                    `
                  : html`
                      <div @click=${this.#onMobileItemClick} tabindex="0" class="navbar-top-link">
                        ${label}<dy-use .element=${icons.expand}></dy-use>
                      </div>
                    `}
                ${items
                  ? html`
                      <ul class="dropdown">
                        ${items.map(
                          (item) => html`
                            <li>
                              <dy-link href=${item.href}>
                                ${item.label}
                                ${this.#isOutwardLink(item.href)
                                  ? html`<dy-use class="outward" .element=${icons.outward}></dy-use>`
                                  : ''}
                              </dy-link>
                            </li>
                          `,
                        )}
                      </ul>
                    `
                  : ''}
              </li>
            `,
          )}
        </ul>

        <div style="flex-grow: 1" @click=${() => this.setState({ drawerOpen: false })}></div>
      </nav>

      ${this.#navSlot}
    `;
  };
}
