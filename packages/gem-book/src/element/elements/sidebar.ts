import { html, GemElement, customElement, TemplateResult, connectStore, classMap } from '@mantou/gem';
import { mediaQuery } from '@mantou/gem/helper/mediaquery';

import { NavItem } from '../../common/config';
import { capitalize } from '../lib/utils';
import { theme } from '../helper/theme';
import { bookStore } from '../store';

import { icons } from './icons';

import '@mantou/gem/elements/link';
import '@mantou/gem/elements/use';
import './side-link';

@customElement('gem-book-sidebar')
@connectStore(bookStore)
export class SideBar extends GemElement {
  #toggleLinks = (e: MouseEvent) => {
    const ele = e.target as HTMLDivElement;
    ele.classList.toggle('close');
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
          <div class="item" @click=${this.#toggleLinks}>
            <gem-use class="arrow" .element=${icons.arrow}></gem-use>
            ${capitalize(title)}
          </div>
          <div class="links item">${children.map((item) => this.#renderItem(item))}</div>
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
    return html`
      <style>
        :host {
          display: block;
          overflow: auto;
          overscroll-behavior: contain;
          box-sizing: border-box;
          position: sticky;
          top: 0;
          padding: 3rem 1rem 0;
          margin: 0 -1rem;
          font-size: 0.875rem;
          scrollbar-width: thin;
        }
        @media ${mediaQuery.PHONE} {
          :host {
            position: static;
            height: auto;
            margin: 0;
            padding: 0;
            overflow: visible;
            border-bottom: 1px solid ${theme.borderColor};
          }
        }
        :host::after {
          content: '';
          display: block;
          height: 2rem;
        }
        .link {
          display: block;
          color: inherit;
          text-decoration: none;
          line-height: 1.5;
          padding: 0.15em 0;
          color: inherit;
        }
        .file:where(:state(active), [data-active]) {
          font-weight: bolder;
        }
        .link:where(:state(match), [data-match]) + .hash {
          display: block;
        }
        .heading:not(:where(:state(active), [data-active])):not(:hover),
        .file:not(:where(:state(active), [data-active])):hover {
          opacity: 0.6;
        }
        .arrow {
          width: 6px;
          height: 10px;
          margin-right: calc(1em - 6px);
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
          margin-right: calc(1em - 4px);
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
      </style>
      <slot></slot>
      ${bookStore.currentSidebar?.map((item) => this.#renderItem(item, true))}
    `;
  }

  updated() {
    const activeEle = this.shadowRoot?.querySelector(':where(:state(active), [data-active])');
    const removeCloseClass = (e: Element | null | undefined) => {
      if (e) {
        e.classList.remove('close');
        removeCloseClass(e.parentElement?.previousElementSibling);
      }
    };
    removeCloseClass(activeEle);
  }
}
