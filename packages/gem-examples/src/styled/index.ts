import { adoptedStyle, css, customElement, GemElement, html, render, SheetToken, styled } from '@mantou/gem';

import '../elements/layout';

const styles = css({
  $: styled`
    font-style: italic;
  `,
  div: styled`
    color: blue;
    &:hover {
      color: red;
    }
  `,
});

const styles2 = css({
  [styles.div]: styled`
    font-weight: bold;
    font-size: 2em;
  `,
});

@adoptedStyle(styles)
@adoptedStyle(styles2)
@customElement('app-root')
export class App extends GemElement {
  render() {
    return html`
      <div class=${styles.div}>Header 1</div>
      ${[styles, styles2].map(
        (gemStyles) => html`<pre>${gemStyles[SheetToken].getStyle(this).cssRules[0].cssText}</pre>`,
      )}
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
