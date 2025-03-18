import { GemElement, html, adoptedStyle, customElement, css } from '@mantou/gem';

import './card';
import './header';

const style = css`
  :scope {
    display: block;
    font-size: large;
  }
  .main {
    display: flex;
    justify-content: center;
    gap: 1em;
  }
`;

@customElement('gem-ssr-app')
@adoptedStyle(style)
export class GemSsrAppElement extends GemElement {
  render = () => {
    return html`
      ${html`<gem-ssr-header></gem-ssr-header>`}
      <div class="main">
        <gem-ssr-card header=${'Card 1'}>
          Nulla deserunt labore amet occaecat ad officia. Proident mollit elit nostrud nostrud nulla pariatur mollit
          cillum pariatur commodo sunt enim. Dolor exercitation duis magna nisi excepteur proident exercitation mollit.
          Amet cillum excepteur nulla ipsum incididunt.
        </gem-ssr-card>
        <gem-ssr-card header="Card 2">
          Nulla deserunt labore amet occaecat ad officia. Proident mollit elit nostrud nostrud nulla pariatur mollit
          cillum pariatur commodo sunt enim. Dolor exercitation duis magna nisi excepteur proident exercitation mollit.
          Amet cillum excepteur nulla ipsum incididunt.
        </gem-ssr-card>
        <gem-ssr-card header="Card 3">
          Nulla deserunt labore amet occaecat ad officia. Proident mollit elit nostrud nostrud nulla pariatur mollit
          cillum pariatur commodo sunt enim. Dolor exercitation duis magna nisi excepteur proident exercitation mollit.
          Amet cillum excepteur nulla ipsum incididunt.
        </gem-ssr-card>
      </div>
    `;
  };
}
