/**
 * TODO: auto add `@scope` to light dom custom element
 */
import { GemElement, adoptedStyle, createCSSSheet, css, customElement, html, render } from '@mantou/gem';

import '../elements/layout';

@customElement('other-element')
class _OtherElement extends GemElement {}

const style = createCSSSheet(css`
  :scope {
    font-style: italic;
  }
  p {
    text-decoration: underline;
  }
`);

@customElement('app-root')
@adoptedStyle(style)
export class App extends GemElement {
  render() {
    return html`
      Text
      <header><h1>Header</h1></header>
      <p>Content</p>
      <other-element>
        <p>Other Content</p>
      </other-element>
      <article>
        <p>Content</p>
      </article>
    `;
  }
}

render(
  html`
    <gem-examples-layout>
      <app-root></app-root>
    </gem-examples-layout>
  `,
  document.body,
);
