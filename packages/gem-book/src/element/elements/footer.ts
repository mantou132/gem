import { html, GemElement, customElement, connectStore, css, createCSSSheet, adoptedStyle } from '@mantou/gem';

import { selfI18n } from '../helper/i18n';
import { theme } from '../helper/theme';
import { bookStore } from '../store';
import { unsafeRenderHTML } from '../lib/renderer';

import '@mantou/gem/elements/link';

const styles = createCSSSheet(css`
  :scope {
    display: block;
    padding-block: 2rem;
    box-sizing: border-box;
    border-top: 1px solid ${theme.borderColor};
    font-style: italic;
    line-height: 1.5;
    color: rgb(from ${theme.textColor} r g b / 0.5);
  }
  gem-link {
    color: ${theme.textColor};
    text-decoration: none;
  }
  gem-link:hover {
    opacity: 0.8;
  }
`);

@customElement('gem-book-footer')
@connectStore(bookStore)
@adoptedStyle(styles)
export class Footer extends GemElement {
  render() {
    const { config } = bookStore;
    return html`
      ${config?.footer
        ? unsafeRenderHTML(
            config.footer,
            css`
              p {
                margin: 0;
              }
              .link,
              .link:hover {
                background: none;
              }
            `,
          )
        : selfI18n.get('footer', (t) => html`<gem-link href="https://book.gemjs.org">${t}</gem-link>`)}
    `;
  }
}
