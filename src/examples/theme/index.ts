import { GemElement, html, render, customElement, connectStore } from '../../';
import { createTheme, getThemeStore, updateTheme } from '../../helper/theme';
import { mediaQuery } from '../../helper/mediaquery';

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

@customElement('app-root')
@connectStore(themeStore)
export class App extends GemElement {
  render() {
    return html`
      <style>
        div {
          color: rgba(${theme.color}, 0.5);
          border: 2px solid ${theme.primaryColor};
        }
        @media ${mediaQuery.PRINT} {
          div {
            border: 2px solid ${printTheme.primaryColor};
          }
        }
      </style>
      <div>color: ${themeStore.primaryColor}</div>
    `;
  }
}

render(
  html`
    <gem-examples-layout>
      <app-root slot="main"></app-root>
    </gem-examples-layout>
  `,
  document.body,
);
