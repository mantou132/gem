import { GemElement, adoptedStyle, createCSSSheet, customElement, html, render, shadow } from '@mantou/gem';

import '../elements/layout';

const closedStyles = createCSSSheet`
  div {
    color: red;
  }
`;
@shadow({ mode: 'closed' })
@adoptedStyle(closedStyles)
@customElement('closed-shadow-dom')
class _Closed extends GemElement {
  render() {
    return html`<div>Closed shadow red content</div>`;
  }
}

@customElement('light-dom')
class _OtherElement extends GemElement {
  render() {
    return html`<p>Other Content</p>`;
  }
}

const style = createCSSSheet`
  :scope {
    font-style: italic;
  }
  p {
    text-decoration: underline;
  }
`;

@customElement('app-root')
@adoptedStyle(style)
export class App extends GemElement {
  render() {
    return html`
      Text
      <header><h1>Header</h1></header>
      <p>Underline Content</p>
      <light-dom></light-dom>
      <article>
        <p>Underline Content</p>
      </article>
      <closed-shadow-dom></closed-shadow-dom>
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
