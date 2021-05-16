import { GemElement, html, styled, createCSSSheet, render } from '../../';

import '../elements/layout';

const styles = createCSSSheet({
  h1: styled.class`
    color: yellow;
    &:hover {
      color: red;
    }
  `,
  h2: styled.id`
    background: yellow;
    &:hover {
      background: red;
    }
  `,
});

class App extends GemElement {
  static adoptedStyleSheets = [styles];
  render() {
    return html`
      <h1 class=${styles.h1}>Header 1</h1>
      <h2 id=${styles.h2}>Header 2</h2>
    `;
  }
}

customElements.define('app-root', App);

render(
  html`
    <gem-examples-layout>
      <app-root slot="main"></app-root>
    </gem-examples-layout>
  `,
  document.body,
);
