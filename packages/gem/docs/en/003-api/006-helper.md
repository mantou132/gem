# Helper

Gem also contains some commonly used functions, they are not built-in by default, you need to introduce them manually:

```js
import { createTheme } from '@mantou/gem/helper/theme';
```

| name                                        | description                         |
| ------------------------------------------- | ----------------------------------- |
| `createTheme`/`getThemeStore` | Themes created and updated          |
| `mediaQuery`                                | CSS media query constants           |
| `request`/`get`/`post`/`del`/`put`          | Simple and convenient call REST API |
| `I18n`                                      | Support internationalization        |
