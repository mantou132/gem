# Helper

Gem also contains some commonly used functions, they are not built-in by default, you need to introduce them manually:

```js
import { createTheme, updateTheme } from '@mantou/gem/helper/theme';
```

| name                               | description                            |
| ---------------------------------- | -------------------------------------- |
| `createTheme`/`updateTheme`        | CSS themes created and updated with JS |
| `mediaQuery`                       | CSS media query constants              |
| `request`/`get`/`post`/`del`/`put` | Simple and convenient call REST API    |
| `I18n`                             | Support internationalization           |
