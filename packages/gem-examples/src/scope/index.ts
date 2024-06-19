/**
 * TODO: auto add `@scope` to light dom custom element
 */
import { GemElement, adoptedStyle, createCSSSheet, css, customElement, html, render } from '@mantou/gem';

import '../elements/layout';

const style = createCSSSheet(css`
  @scope (app-root) to ([ref]) {
    :scope {
      font-style: italic;
    }
    p {
      text-decoration: underline;
    }
  }
`);

@customElement('app-root')
@adoptedStyle(style)
export class App extends GemElement {
  constructor() {
    super({ isLight: true });
  }
  render() {
    return html`
      Text
      <header><h1>Header</h1></header>
      <p>Content</p>
      <gem-element ref="">
        <p>Other Content</p>
      </gem-element>
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
