# 自定义 DuoyunUI

DuoyunUI 自带主题（包含一套暗黑主题）、图标（例如 `<dy-loading>`）、文本（例如 `<dy-pagination>`）都能轻松使用和修改，
在你的应用中，你可以这样使用它们：

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

## 自定义主题

使用自带暗黑主题：

```ts
import { updateTheme, darkTheme } from 'duoyun-ui/lib/theme';

updateTheme(darkTheme);
```

使用自定义主题色：

```ts
import { updateTheme } from 'duoyun-ui/lib/theme';

updateTheme({ primaryColor: 'blue' });
```

## 自定义图标

目前 DuoyunUI 使用 [Material Icon](https://fonts.google.com/icons?selected=Material+Icons)，修改 Icon：

```ts
import { setIcons } from 'duoyun-ui/lib/icons';

setIcons({
  more: `
    <svg part="icon" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor">
      <path d="M0 0h24v24H0z" fill="none" stroke="none"></path>
      <path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"></path>
    </svg>
  `,
});
```

## 自定义语言

DuoyunUI 默认使用英语，指定成中文并修改某个文本：

```ts
import { updateLocale } from 'duoyun-ui/lib/locale';
import zh from 'duoyun-ui/locales/zh';

updateLocale({ ...zh, more: '其他' });
```

`updateLocale` 的参数支持 `Promise`，所以你可以很方便的按需加载，下面是 Gem [I18n](https://gem.js.org/en/guide/advance/i18n) 方案的例子：

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
  onChange: async (code: keyof typeof langNames) => {
    switch (code) {
      case 'en':
        return updateLocale(import('duoyun-ui/locales/en'));
      case 'zh-CN':
        return updateLocale(import('duoyun-ui/locales/zh'));
    }
  },
});
```