# Helper

Gem 将辅助能力放在独立子路径中导出，可以按需导入：

```js
import { createTheme, createDecoratorTheme } from '@mantou/gem/helper/theme';
```

| 模块                 | 主要导出                                                                                                            | 用途                                            |
| -------------------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `helper/theme`       | `createTheme`、`createScopedTheme`、`createOverrideTheme`、`createDecoratorTheme`、`getThemeStore`、`getThemeProps` | 创建和更新全局、作用域或元素主题                |
| `helper/mediaquery`  | `mediaQuery`                                                                                                        | 常用媒体查询及其当前匹配状态                    |
| `helper/request`     | `initRequest`、`request`、`get`、`post`、`put`、`del`                                                               | 支持 JSON 处理和请求定制的 Fetch 辅助函数       |
| `helper/i18n`        | `I18n`、`splice`                                                                                                    | 国际化                                          |
| `helper/react-utils` | `renderReactNode`、`connectStore`、`useReactNode`                                                                   | 在 React 中使用 Gem 元素和 Store                |
| `helper/ssr-shim`    | 副作用模块                                                                                                          | 在 Node 中加载 Gem 时提供最小化的浏览器全局对象 |
| `helper/logger`      | `Logger`、`logger`                                                                                                  | 带前缀的轻量级控制台日志工具                    |

例如，可通过 `import { mediaQuery } from '@mantou/gem/helper/mediaquery'` 导入模块。React 辅助函数需要安装 React 和 React DOM，其他模块不需要。
