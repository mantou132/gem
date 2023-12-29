import {
  html,
  GemElement,
  customElement,
  TemplateResult,
  connectStore,
  classMap,
  state,
  connect,
  useStore,
  refobject,
  RefObject,
} from '@mantou/gem';
import { mediaQuery } from '@mantou/gem/helper/mediaquery';

import { NavItem } from '../../common/config';
import { capitalize, isSameOrigin } from '../lib/utils';
import { theme } from '../helper/theme';
import { bookStore, locationStore } from '../store';
import { GemBookElement } from '..';

import { icons } from './icons';

import '@mantou/gem/elements/link';
import '@mantou/gem/elements/use';
import './side-link';
import './nav-logo';

export const [sidebarStore, updateSidebarStore] = useStore({ open: false });

@customElement('gem-book-sidebar')
@connectStore(bookStore)
@connectStore(sidebarStore)
export class SideBar extends GemElement {
  @refobject navRef: RefObject<HTMLElement>;

  @state open: boolean;

  get #currentLink() {
    return this.shadowRoot?.querySelector(':where(:state(active), [data-active])');
  }

  #closeSidebar = () => updateSidebarStore({ open: false });

  #toggleLinks = (e: MouseEvent) => {
    const ele = e.target as HTMLDivElement;
    ele.classList.toggle('close');
  };

  #expandToCurrentLink = () => {
    const removeCloseClass = (ele: Element | null | undefined) => {
      if (!ele) return;
      ele.classList.remove('close');
      removeCloseClass(ele.parentElement?.previousElementSibling);
    };
    removeCloseClass(this.#currentLink);
  };

  #renderItem = (
    { type = 'file', link, title, children, sidebarIgnore }: NavItem,
    isTop = false,
  ): TemplateResult | null => {
    const { homePage, config } = bookStore;
    const homeMode = config?.homeMode;
    if (sidebarIgnore || (homeMode && homePage === link)) {
      return html`<!-- No need to render homepage item -->`;
    }
    switch (type) {
      case 'dir': {
        if (!children?.length) {
          return html`<!-- No need for an empty directory -->`;
        }
        return html`
          <div class="item dir-title" @click=${this.#toggleLinks}>
            <gem-use class="arrow" .element=${icons.arrow}></gem-use>
            ${capitalize(title)}
          </div>
          <div class="links item dir">${children.map((item) => this.#renderItem(item))}</div>
        `;
      }
      case 'file': {
        return html`
          <gem-book-side-link
            class=${classMap({ item: true, link: true, single: isTop, [type]: true })}
            pattern=${children ? new URL(link, location.origin).pathname : link}
            href=${link}
          >
            ${title ? capitalize(title) : 'No title'}
          </gem-book-side-link>
          ${children
            ? html`<div class="links item hash">${children.map((item) => this.#renderItem(item))}</div>`
            : null}
        `;
      }
      case 'heading': {
        return html`
          <gem-book-side-link
            class=${classMap({ item: true, link: true, single: isTop, [type]: true })}
            hash=${link}
            href=${link}
          >
            # ${title ? capitalize(title) : 'No title'}
          </gem-book-side-link>
        `;
      }
    }
  };

  render() {
    this.open = sidebarStore.open;
    const topNavList = bookStore.nav?.filter((e) => isSameOrigin(e.link));
    return html`
      <style>
        :host {
          display: flex;
          flex-direction: column;
          height: 100vh;
        }
        :host,
        gem-book-nav-logo {
          position: sticky;
          top: 0;
        }
        gem-book-nav-logo {
          /**挡住橡皮条效果下面的线 */
          background: ${theme.backgroundColor};
          border-block-end: 1px solid ${theme.borderColor};
        }
        gem-book-nav-logo,
        .nav {
          padding-inline: 1.5rem;
        }
        .nav {
          border-inline-end: 1px solid ${theme.borderColor};
          padding-block: 2rem;
          font-size: 0.875rem;
          flex-grow: 1;
          overflow: auto;
          scrollbar-width: thin;
          overscroll-behavior: contain;
        }
        .top-nav {
          display: flex;
          gap: 1em;
          margin-block-end: 2rem;
        }
        .top-nav gem-active-link {
          display: inline-block;
          color: inherit;
          text-decoration: none;
          line-height: 2;
          padding: 0 1em;
          border-radius: 10em;
          background: rgba(${theme.primaryColorRGB}, 0.1);
        }
        .top-nav gem-active-link:where(:state(active), [data-active]) {
          color: ${theme.primaryColor};
        }
        .link {
          display: block;
          color: inherit;
          text-decoration: none;
          line-height: 2;
        }
        .file:where(:state(active), [data-active]) {
          color: ${theme.primaryColor};
        }
        .heading:not(:where(:state(active), [data-active])):not(:hover),
        .file:not(:where(:state(active), [data-active])):hover {
          transition: opacity 0.1s;
          opacity: 0.6;
        }
        .arrow {
          width: 6px;
          height: 10px;
          margin-right: calc(1rem - 6px);
        }
        .close + .links {
          display: none;
        }
        .links {
          position: relative;
        }
        .links::before {
          position: absolute;
          content: '';
          height: 100%;
          border-left: 1px solid ${theme.borderColor};
          transform: translateX(0.15em);
        }
        .hash {
          display: none;
        }
        .item {
          cursor: pointer;
        }
        .dir-title {
          font-size: 1rem;
          font-weight: bolder;
        }
        .item:not(.links) {
          display: flex;
          align-items: center;
        }
        .single {
          display: flex;
          align-items: center;
        }
        .single::before {
          content: '';
          display: block;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: currentColor;
          margin-right: calc(1rem - 4px);
          opacity: 0.6;
          flex-shrink: 0;
        }
        .item gem-use {
          transform: rotate(90deg);
        }
        .item.close gem-use {
          transform: rotate(0deg);
        }
        .item .item {
          margin-left: 1rem;
        }
        .item + .item {
          margin-top: 0.5rem;
        }
        .item + .dir-title {
          margin-top: 2rem;
        }
        .links.dir,
        .dir-title.close {
          margin-bottom: 2rem;
        }
        @media not ${`(${mediaQuery.DESKTOP})`} {
          .link:where(:state(match), [data-match]) + .hash {
            display: block;
          }
        }
        @media ${mediaQuery.PHONE} {
          :host {
            position: fixed;
            background: ${theme.backgroundColor};
            width: 100%;
            height: calc(100dvh - ${theme.headerHeight});
            top: ${theme.headerHeight};
            z-index: 3;
          }
          :host(:not(:where([data-open], :state(open)))) {
            display: none;
          }
          .nav {
            border-inline-end: none;
          }
          gem-book-nav-logo {
            display: none;
          }
        }
      </style>
      <gem-book-nav-logo>
        <slot name=${GemBookElement.logoAfter}></slot>
      </gem-book-nav-logo>
      <div class="nav" ref=${this.navRef.ref}>
        ${mediaQuery.isPhone && topNavList?.length
          ? html`
              <div class="top-nav">
                ${topNavList.map(
                  ({ link, navTitle, title }) => html`
                    <gem-active-link href=${link} pattern="${link}*">
                      ${capitalize(navTitle || title)}
                    </gem-active-link>
                  `,
                )}
              </div>
            `
          : ''}
        <slot></slot>
        ${bookStore.currentSidebar?.map((item) => this.#renderItem(item, true))}
      </div>
    `;
  }

  mounted() {
    this.effect(
      () => this.#expandToCurrentLink(),
      () => [locationStore.path],
    );

    this.#currentLink?.scrollIntoView({ block: 'center' });

    addEventListener('hashchange', this.#closeSidebar);

    const disconnect = connect(locationStore, this.#closeSidebar);

    return () => {
      removeEventListener('hashchange', this.#closeSidebar);
      disconnect();
    };
  }
}
