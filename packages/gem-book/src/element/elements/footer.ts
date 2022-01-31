import { html, GemElement, customElement, connectStore, css } from '@mantou/gem';
import { mediaQuery } from '@mantou/gem/helper/mediaquery';

import { selfI18n } from '../helper/i18n';
import { theme } from '../helper/theme';
import { bookStore } from '../store';

import { mdRender } from './main';

import '@mantou/gem/elements/link';

@customElement('gem-book-footer')
@connectStore(selfI18n.store)
@connectStore(bookStore)
export class Footer extends GemElement {
  render() {
    const { config } = bookStore;
    return html`
      <style>
        :host {
          display: block;
          padding: 2rem 0;
          margin-top: 6rem;
          border-top: 1px solid ${theme.borderColor};
          font-style: italic;
          line-height: 1.5;
          color: rgba(${theme.textColorRGB}, 0.5);
        }
        @media ${mediaQuery.PHONE} {
          :host {
            margin: 0;
          }
        }
        gem-link {
          color: ${theme.textColor};
          border-bottom: 1px solid rgba(${theme.textColorRGB}, 0.3);
          text-decoration: none;
        }
        gem-link:hover {
          border-bottom: 1px solid;
        }
      </style>
      ${config?.footer
        ? mdRender.unsafeRenderHTML(
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
        : selfI18n.get('footer', (t) => html`<gem-link href="https://book.gemjs.org">&lt;${t}&gt;</gem-link>`)}
    `;
  }
}
