# Theme

[CSS variables](https://developer.mozilla.org/en-US/docs/Web/CSS/--*) can easily implement the theme, using the theme modules provided by Gem will have more advantages:

- TypeScript integration
- Prevent multiple theme CSS custom property name conflicts
- Observable `ThemeStore` object

## Getting started

```js
import { createTheme } from '@mantou/gem/helper/theme';

const theme = createTheme({
  primaryColor: '#eee',
});

@customElement('app-root')
class App extends GemElement {
  render() {
    return html`
      <style>
        div {
          border: 2px solid ${theme.primaryColor};
        }
      </style>
    `;
  }
}
```

## Read the original object

As can be seen from the above usage, once an object is created as a theme, the fields read from the theme are CSS variables:

```js
console.log(theme.primaryColor);
// => var(--primary-color-xxxxx)
```

Sometimes you may need to read the original object, such as printing the subject to the element:

```js 7,10,19
import { createTheme, getThemeStore } from '@mantou/gem/helper/theme';

const theme = createTheme({
  primaryColor: '#eee',
});

const themeStore = getThemeStore(theme);

@customElement('app-root')
@connectStore(themeStore)
class App extends GemElement {
  render() {
    return html`
      <style>
        div {
          border: 2px solid ${theme.primaryColor};
        }
      </style>
      <div>primaryColor: ${themeStore.primaryColor}</div>
    `;
  }
}
```

## Dark mode

If you want to support dark mode, you can use [`matchMedia`](https://developer.mozilla.org/en-US/docs/Web/API/Window/matchMedia) for media queries, and then use different themes, E.g:

```js 11
import { createTheme } from '@mantou/gem/helper/theme';

const lightTheme = {
  primaryColor: '#333',
};

const darkTheme = {
  primaryColor: '#eee',
};

const theme = createTheme(matchMedia('(prefers-color-scheme: dark)').matches ? darkTheme : lightTheme);

@customElement('app-root')
class App extends GemElement {
  render() {
    return html`
      <style>
        div {
          border: 2px solid ${theme.primaryColor};
        }
      </style>
    `;
  }
}
```

## Scoped and override theme

<gbp-include src="../../snippets/scoped-theme.md"></gbp-include>