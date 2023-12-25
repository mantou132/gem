import { GemElement, html, adoptedStyle, customElement, createCSSSheet, css, connectStore } from '@mantou/gem';

import { bookStore } from '../store';
import { theme } from '../helper/theme';

const style = createCSSSheet(css`
  :host {
    height: ${theme.headerHeight};
    font-size: 1.2rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    box-sizing: border-box;
    flex-shrink: 0;
  }
  gem-link {
    display: contents;
    text-decoration: none;
    color: inherit;
  }
  img {
    height: calc(0.8 * ${theme.headerHeight});
    min-width: calc(0.8 * ${theme.headerHeight});
    object-fit: contain;
    transform: translateX(-10%);
  }
`);

/**
 * @customElement gem-book-nav-logo
 */
@customElement('gem-book-nav-logo')
@connectStore(bookStore)
@adoptedStyle(style)
export class GemBookNavLogoElement extends GemElement {
  render = () => {
    const { config } = bookStore;
    const { icon = '', title = '' } = config || {};
    return html`
      <gem-link path="/">
        ${icon ? html`<img alt=${title} src=${icon} aria-hidden="true" />` : null} ${title}
      </gem-link>
    `;
  };
}
