# Helper

Gem keeps optional helpers in subpath modules. Import only the modules you need:

```js
import { createTheme, createDecoratorTheme } from '@mantou/gem/helper/theme';
```

| Module               | Main exports                                                                                                        | Purpose                                                    |
| -------------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `helper/theme`       | `createTheme`, `createScopedTheme`, `createOverrideTheme`, `createDecoratorTheme`, `getThemeStore`, `getThemeProps` | Create and update global, scoped, or element themes        |
| `helper/mediaquery`  | `mediaQuery`                                                                                                        | Common media queries and their current match state         |
| `helper/request`     | `initRequest`, `request`, `get`, `post`, `put`, `del`                                                               | Fetch helpers with JSON handling and request customization |
| `helper/i18n`        | `I18n`, `splice`                                                                                                    | Internationalization                                       |
| `helper/react-utils` | `renderReactNode`, `connectStore`, `useReactNode`                                                                   | Use Gem elements and Stores with React                     |
| `helper/ssr-shim`    | Side-effect module                                                                                                  | Provide minimal browser globals when loading Gem in Node   |
| `helper/logger`      | `Logger`, `logger`                                                                                                  | Small prefixed console logger                              |

For example, import a module with `import { mediaQuery } from '@mantou/gem/helper/mediaquery'`. The React helpers require React and React DOM; other helpers do not.
