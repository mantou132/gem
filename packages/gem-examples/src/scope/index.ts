import { GemElement, adoptedStyle, createCSSSheet, css, customElement, html, render, shadow } from '@mantou/gem';

import '../elements/layout';

const closedStyles = createCSSSheet(css`
  div {
    color: red;
  }
`);
@shadow({ mode: 'closed' })
@adoptedStyle(closedStyles)
@customElement('app-closed')
class _Closed extends GemElement {
  render() {
    return html`<div>Closed shadow</div>`;
  }
}

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
      <app-closed></app-closed>
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
