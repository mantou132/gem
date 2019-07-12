import { GemElement, html, styled, createCSSSheet } from '../../';

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
  h3: styled.tag`
    text-decoration: underline;
    &:hover {
      text-decoration: none;
    }
  `,
});

class App extends GemElement {
  static adoptedStyleSheets = [styles];
  render() {
    return html`
      <h1 class=${styles.h1}>Header 1</h1>
      <h2 id=${styles.h2}>Header 2</h2>
      <h3>Header 3</h3>
    `;
  }
}

customElements.define('app-root', App);
document.body.append(new App());
