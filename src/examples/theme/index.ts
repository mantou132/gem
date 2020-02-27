import { GemElement, html } from '../../';
import { createTheme, updateTheme } from '../../helper/theme';
import mediaQuery from '../../helper/mediaquery';

const theme = createTheme({
  // 支持动态修改不透明度
  color: '0, 0, 0',
  primaryColor: '#eee',
});

const printTheme = createTheme(
  {
    primaryColor: 'yellow',
  },
  mediaQuery.PRINT,
);

document.onclick = () => {
  updateTheme(theme, {
    primaryColor: Math.random() > 0.5 ? 'red' : 'blue',
  });
  updateTheme(printTheme, {
    primaryColor: Math.random() > 0.5 ? 'gray' : 'white',
  });
};

class App extends GemElement {
  render() {
    return html`
      <style>
        div {
          color: rgba(${theme.color}, 0.5);
          background-color: ${theme.primaryColor};
        }
      </style>
      <div>hello world!</div>
    `;
  }
}
customElements.define('app-root', App);
document.body.append(new App());
