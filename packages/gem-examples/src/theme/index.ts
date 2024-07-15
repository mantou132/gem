import { GemElement, html, render, customElement, connectStore, createCSSSheet, css, adoptedStyle } from '@mantou/gem';
import { createTheme, getThemeStore, updateTheme } from '@mantou/gem/helper/theme';
import { mediaQuery } from '@mantou/gem/helper/mediaquery';

import '../elements/layout';

const theme = createTheme({
  // 支持动态修改不透明度
  color: '0, 0, 0',
  primaryColor: '#eee',
});

const themeStore = getThemeStore(theme);

const printTheme = createTheme({
  primaryColor: 'yellow',
});

document.onclick = () => {
  updateTheme(theme, {
    primaryColor: Math.random() > 0.5 ? 'red' : 'blue',
  });
  updateTheme(printTheme, {
    primaryColor: Math.random() > 0.5 ? 'gray' : 'white',
  });
};

const style = createCSSSheet(css`
  div {
    color: rgba(${theme.color}, 0.5);
    border: 2px solid ${theme.primaryColor};
  }
`);

const style1 = createCSSSheet(
  css`
    div {
      border: 2px solid ${printTheme.primaryColor};
    }
  `,
  mediaQuery.PRINT,
);

@customElement('app-root')
@connectStore(themeStore)
@adoptedStyle(style1)
@adoptedStyle(style)
export class App extends GemElement {
  render() {
    return html`<div>color: ${themeStore.primaryColor}</div>`;
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
