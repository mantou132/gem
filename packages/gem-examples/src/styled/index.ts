import { GemElement, html, styled, createCSSSheet, render, adoptedStyle, customElement } from '@mantou/gem';

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

@adoptedStyle(styles)
@customElement('app-root')
export class App extends GemElement {
  render() {
    return html`
      <h1 class=${styles.h1}>Header 1</h1>
      <h2 id=${styles.h2}>Header 2</h2>
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
