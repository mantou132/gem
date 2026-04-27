import { adoptedStyle, css, customElement, GemElement, html } from '@mantou/gem';
import '@mantou/gem/elements/route';
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
  gem-light-route {
    display: contents;
  }
`;

@customElement('gem-ssr-app')
@adoptedStyle(style)
export class GemSsrAppElement extends GemElement {
  render = () => {
    return html`
      ${html`<gem-ssr-header></gem-ssr-header><span></span>`}
      <div class="main">
        <gem-light-route .routes=${[
          {
            pattern: '/',
            getContent: async () => {
              await import('./card');
              const cards = [1, 2, 3].map((i) => ({
                header: `Card ${i}`,
                content:
                  'Nulla deserunt labore amet occaecat ad officia. Proident mollit elit nostrud nostrud nulla pariatur mollit cillum pariatur commodo sunt enim. Dolor exercitation duis magna nisi excepteur proident exercitation mollit. Amet cillum excepteur nulla ipsum incididunt.',
              }));
              return html`
                ${cards.map((card) => html`<gem-ssr-card header=${card.header}>${card.content}</gem-ssr-card>`)}
              `;
            },
          },
        ]}></gem-light-route>
      </div>
    `;
  };
}
