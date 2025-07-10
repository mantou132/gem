import { adoptedStyle, aria, connectStore, css, customElement, GemElement, html } from '@mantou/gem';

import { selfI18n } from '../helper/i18n';
import { theme } from '../helper/theme';
import { unsafeRenderHTML } from '../lib/renderer';
import { bookStore } from '../store';

import '@mantou/gem/elements/link';

const styles = css`
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
`;

const footerStyle = css`
  p {
    margin: 0;
  }
  .link,
  .link:hover {
    background: none;
  }
`;

@customElement('gem-book-footer')
@connectStore(bookStore)
@adoptedStyle(styles)
@aria({ role: 'contentinfo' })
export class Footer extends GemElement {
  render() {
    const { config } = bookStore;
    return html`
      ${
        config?.footer
          ? unsafeRenderHTML(config.footer, footerStyle)
          : selfI18n.get('footer', (t) => html`<gem-link href="https://book.gemjs.org">${t}</gem-link>`)
      }
    `;
  }
}
