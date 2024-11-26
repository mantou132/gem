// @ts-nocheck

export class MyElement extends GemElement {
  render() {
    return html`
      <dy-use></dy-use>
      <dy-pat-console></dy-pat-console>
      ${html`<gem-link></gem-link>`}
    `;
  }
}
