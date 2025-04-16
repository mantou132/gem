import { adoptedStyle, connectStore, css, customElement, GemElement, html, render, styleMap } from '@mantou/gem';
import { mediaQuery } from '@mantou/gem/helper/mediaquery';
import { createOverrideTheme, createScopedTheme, createTheme, getThemeStore } from '@mantou/gem/helper/theme';

import '../elements/layout';

const scopedTheme = createScopedTheme({
  color: '#456',
  borderColor: '#eee',
});

const overrideTheme = createOverrideTheme(scopedTheme, {
  borderColor: '#f0f',
});

const overrideThemeStore = getThemeStore(overrideTheme);

const printTheme = createTheme({
  borderColor: 'yellow',
});

document.onclick = () => {
  overrideTheme({
    borderColor: Math.random() > 0.5 ? 'red' : 'blue',
  });
  printTheme({
    borderColor: Math.random() > 0.5 ? 'gray' : 'white',
  });
};

const style = css`
  div {
    color: ${scopedTheme.color};
    border: 2px solid ${scopedTheme.borderColor};
  }
`;

const printStyle = css(
  mediaQuery.PRINT,
  `
    div {
      border: 2px solid ${printTheme.borderColor};
    }
  `,
);

@customElement('sub-app')
@adoptedStyle(overrideTheme)
class _Sub extends GemElement {
  render() {
    return html`<div
      style=${styleMap({
        border: `2px solid ${scopedTheme.borderColor}`,
      })}
    >
      sub app
    </div>`;
  }
}

@customElement('app-root')
@connectStore(overrideThemeStore)
@adoptedStyle(scopedTheme)
@adoptedStyle(printStyle)
@adoptedStyle(style)
export class App extends GemElement {
  render() {
    return html`
      <div>overrideThemeStore.borderColor: ${overrideThemeStore.borderColor}</div>
      <sub-app></sub-app>
    `;
  }
}

render(
  html`
    <gem-examples-layout>
      <app-root></app-root>
      <div style=${styleMap({ color: scopedTheme.color })}>outer scope, needn't apply style</div>
    </gem-examples-layout>
  `,
  document.body,
);
