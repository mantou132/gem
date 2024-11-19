// @ts-nocheck

export class MyElement extends GemElement {
  render() {
    return html`
      <dy-use></dy-use>
      ${html`<gem-link></gem-link>`}
    `;
  }
}
