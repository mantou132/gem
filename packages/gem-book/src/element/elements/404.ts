import { customElement, GemElement, html } from '@mantou/gem';

import '@mantou/gem/elements/reflect';

@customElement('gem-book-404')
export class Meta extends GemElement {
  render() {
    return html`
      <style>
        h1 {
          font-size: 2em;
          font-weight: bold;
          margin: 0;
        }
      </style>
      <h1>404 - Not found</h1>
      <gem-reflect>
        <meta name="robots" content="noindex" />
      </gem-reflect>
    `;
  }
}
