# Helper

Gem 还包含一些常用的功能，他们没有默认内置, 需要自己手动引入:

```js
import { createTheme } from '@mantou/gem/helper/theme';
```

| 名称                               | 描述                                              |
| ---------------------------------- | ------------------------------------------------- |
| `createTheme`/`getThemeStore`      | 创建和更新主题                                    |
| `mediaQuery`                       | 使用媒体查询查询到的信息以及一些 CSS 媒体查询常量 |
| `request`/`get`/`post`/`del`/`put` | 简单方便的调用 REST API                           |
| `I18n`                             | 支持国际化                                        |
| react-utils                        | 在 React 中使用 Gem                               |
| ssr-shim                           | 支持 SSR                                          |
