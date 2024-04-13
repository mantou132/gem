import { html, GemElement, customElement, connectStore, css } from '@mantou/gem';

import { selfI18n } from '../helper/i18n';
import { theme } from '../helper/theme';
import { bookStore } from '../store';
import { unsafeRenderHTML } from '../lib/renderer';

import '@mantou/gem/elements/link';

@customElement('gem-book-footer')
@connectStore(bookStore)
export class Footer extends GemElement {
  render() {
    const { config } = bookStore;
    return html`
      <style>
        :host {
          display: block;
          padding-block: 2rem;
          box-sizing: border-box;
          border-top: 1px solid ${theme.borderColor};
          font-style: italic;
          line-height: 1.5;
          color: rgba(${theme.textColorRGB}, 0.5);
        }
        gem-link {
          color: ${theme.textColor};
          text-decoration: none;
        }
        gem-link:hover {
          opacity: 0.8;
        }
      </style>
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
