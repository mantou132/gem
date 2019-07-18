import { GemElement, html } from '../../';
import { createTheme, updateTheme } from '../../elements/theme';
import mediaQuery from '../../helper/mediaquery';

const theme = createTheme({
  primaryColor: '#eee',
});

const printTheme = createTheme(mediaQuery.PRINT, {
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
  render() {
    return html`
      <style>
        div {
          background-color: ${theme.primaryColor};
        }
      </style>
      <div>hello world!</div>
    `;
  }
}
customElements.define('app-root', App);
document.body.append(new App());
