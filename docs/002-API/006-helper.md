# Helper

Gem 还包含一些常用的功能，他们没有默认内置, 需要自己手动引入:

```js
import { createTheme, updateTheme } from '@mantou/gem/helper/theme';
```

| 名称                        | 描述                                              |
| --------------------------- | ------------------------------------------------- |
| `createTheme`/`updateTheme` | 用 JS 创建和更新的 CSS 主题                       |
| `mediaQuery`                | 使用媒体查询查询到的信息以及一些 CSS 媒体查询常量 |
