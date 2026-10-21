import { adoptedStyle, css, GemElement, html, template } from '@mantou/gem';
import { layout } from '@mantou/gemkit';

const style = css`
  :scope {
    display: block;
    max-width: 48rem;
    margin: 0 auto;
    padding: 1rem;
    font-family: system-ui, sans-serif;
  }
  nav {
    display: flex;
    gap: 1rem;
  }
`;

@layout()
@adoptedStyle(style)
export default class RootLayout extends GemElement {
  @template()
  #content = () => html`
    <nav>
      <gem-link path="/">Home</gem-link>
      <gem-link path="/about">About</gem-link>
    </nav>
    <main><gemkit-outlet></gemkit-outlet></main>
  `;
}
