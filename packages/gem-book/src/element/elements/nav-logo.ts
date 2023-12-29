import { GemElement, html, customElement, connectStore } from '@mantou/gem';
import { mediaQuery } from '@mantou/gem/helper/mediaquery';

import { bookStore } from '../store';
import { theme } from '../helper/theme';

/**
 * @customElement gem-book-nav-logo
 */
@customElement('gem-book-nav-logo')
@connectStore(bookStore)
export class GemBookNavLogoElement extends GemElement {
  render = () => {
    const { config } = bookStore;
    const { icon = '', title = '' } = config || {};
    if (!icon && !title)
      return html`
        <style>
          :host {
            display: none;
          }
        </style>
      `;
    return html`
      <style>
        :host {
          height: ${theme.headerHeight};
          font-size: 1.2rem;
          font-weight: 700;
          display: flex;
          gap: 0.6rem;
          align-items: center;
          box-sizing: border-box;
          flex-shrink: 0;
        }
        gem-link {
          display: flex;
          align-items: center;
          height: 100%;
          text-decoration: none;
          color: inherit;
        }
        img {
          height: calc(0.8 * ${theme.headerHeight});
          min-width: calc(0.8 * ${theme.headerHeight});
          object-fit: contain;
          transform: translateX(-10%);
        }
        @media ${mediaQuery.PHONE} {
          span,
          ::slotted(*) {
            display: none;
          }
        }
      </style>
      <gem-link path="/">
        ${icon ? html`<img alt=${title} src=${icon} aria-hidden="true" />` : null}
        <span>${title}</span>
      </gem-link>
      <slot></slot>
    `;
  };
}
