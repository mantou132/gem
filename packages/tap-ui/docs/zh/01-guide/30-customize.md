# 自定义 TapUI

TapUI 自带主题、图标、文本，在应用中可以这样使用它们：

```ts
import { css, adoptedStyle, customElement, GemElement, html } from '@mantou/gem';
import { theme } from '@mantou/tap-ui/lib/theme';
import { icons } from '@mantou/tap-ui/lib/icons';
import { locale } from '@mantou/tap-ui/lib/locale';

import '@mantou/gem';

const style = css`
  gem-use {
    color: ${theme.positiveColor};
  }
`;

@customElement('my-ele')
@adoptedStyle(style)
export class MyEleElement extends GemElement {
  render = () => {
    return html`<gem-use .element=${icons.more}>${locale.more}</gem-use>`;
  };
}
```

可以轻松修改或扩展它们。

## 自定义主题

使用自带暗黑主题：

```ts
import { theme, darkTheme } from '@mantou/tap-ui/lib/theme';

theme(darkTheme);
```

使用自定义主题色：

```ts
import { theme } from '@mantou/tap-ui/lib/theme';

theme({ primaryColor: 'blue' });
```

扩展主题：

```ts
import { extendTheme } from '@mantou/tap-ui/lib/theme';

export const theme = extendTheme({ myColor: '#f00' });
```

## 自定义图标

目前 TapUI 使用 [Material Icon](https://fonts.google.com/icons?selected=Material+Icons)，
修改和扩展 Icon：

```ts
import { extendIcons } from '@mantou/tap-ui/lib/icons';

const icons = extendIcons({
  more: `
    <svg part="icon" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor">
      <path d="M0 0h24v24H0z" fill="none" stroke="none"></path>
      <path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"></path>
    </svg>
  `,
  myIcon: ``,
});
```

## 自定义文本

TapUI 默认使用英语，指定成中文并修改某个文本：

```ts
import { locale } from '@mantou/tap-ui/lib/locale';
import zh from '@mantou/tap-ui/locales/zh';

locale({ ...zh, more: '其他' });
```

`loadLocale` 支持加载 `Promise`，所以你可以很方便的按需加载，下面是 Gem [I18n](https://gemjs.org/en/guide/advance/i18n) 方案的例子：

```ts
import { I18n } from '@mantou/gem/helper/i18n';
import { loadLocale } from '@mantou/tap-ui/lib/locale';

import zhCN from 'src/locales/templates/messages.json';

export const i18n = new I18n<typeof zhCN>({
  fallbackLanguage: 'zh-CN',
  resources: {
    'zh-CN': zhCN,
    en: () => import('src/locales/en/messages.json'),
  },
  onChange: (code: keyof typeof langNames) => {
    switch (code) {
      case 'en':
        return loadLocale(import('@mantou/tap-ui/locales/en'));
      case 'zh-CN':
        return loadLocale(import('@mantou/tap-ui/locales/zh'));
    }
  },
});
```

[查看](https://github.com/mantou132/gem/tree/main/packages/tap-ui/src/locales)当前支持的语言。
