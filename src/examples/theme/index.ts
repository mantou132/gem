import { GemElement, html } from '../../';
import { createTheme, getThemeStore, updateTheme } from '../../helper/theme';
import { mediaQuery } from '../../helper/mediaquery';

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

class App extends GemElement {
  static observedStores = [themeStore];
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
customElements.define('app-root', App);
document.body.append(new App());
