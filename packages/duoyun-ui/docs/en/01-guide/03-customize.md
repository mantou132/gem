# Customize

DuoyunUI comes with themes, icons, texts, and can be used in the application:

```ts
import { createCSSSheet, css, adoptedStyle, customElement, GemElement, html } from '@mantou/gem';
import { theme } from 'duoyun-ui/lib/theme';
import { icons } from 'duoyun-ui/lib/icons';
import { locale } from 'duoyun-ui/lib/locale';

import '@mantou/gem';

const style = createCSSSheet(css`
  :host {
    color: ${theme.positiveColor};
  }
`);

@customElement('my-ele')
@adoptedStyle(style)
export class MyEleElement extends GemElement {
  render = () => {
    return html`<gem-use .element=${icons.more}>${locale.more}</gem-use>`;
  };
}
```

Can be easily modified or extended.

## Customize theme

Use build-in dark theme:

```ts
import { updateTheme, darkTheme } from 'duoyun-ui/lib/theme';

updateTheme(darkTheme);
```

Use customize theme:

```ts
import { updateTheme } from 'duoyun-ui/lib/theme';

updateTheme({ primaryColor: 'blue' });
```

Extend theme:

```ts
import { extendTheme } from 'duoyun-ui/lib/theme';

export const [theme, updateTheme] = extendTheme({ myColor: '#f00' });
```

## Customize icon

Currently DuoyunUI uses [Material Icon](https://fonts.google.com/icons?selected=Material+Icons), modify icon:

```ts
import { extendIcons } from 'duoyun-ui/lib/icons';

const [icons, updateIcons] = extendIcons({
  more: `
    <svg part="icon" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor">
      <path d="M0 0h24v24H0z" fill="none" stroke="none"></path>
      <path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"></path>
    </svg>
  `,
  myIcon: ``,
});
```

## Customize text

DuoyunUI defaults English, specifying Chinese and modifying a text:

```ts
import { updateLocale } from 'duoyun-ui/lib/locale';
import zh from 'duoyun-ui/locales/zh';

updateLocale({ ...zh, more: '其他' });
```

`updateLocale` support `Promise`, so you can be loaded on demand, the following is an example of Gem [I18n](https://gemjs.org/en/guide/advance/i18n) scheme:

```ts
import { I18n } from '@mantou/gem/helper/i18n';
import { updateLocale } from 'duoyun-ui/lib/locale';

import zhCN from 'src/locales/templates/messages.json';
import enURI from 'src/locales/en/messages.json?url';

export const i18n = new I18n<typeof zhCN>({
  fallbackLanguage: 'zh-CN',
  resources: {
    'zh-CN': zhCN,
    en: enURI,
  },
  onChange: (code: keyof typeof langNames) => {
    switch (code) {
      case 'en':
        return updateLocale(import('duoyun-ui/locales/en'));
      case 'zh-CN':
        return updateLocale(import('duoyun-ui/locales/zh'));
    }
  },
});
```
