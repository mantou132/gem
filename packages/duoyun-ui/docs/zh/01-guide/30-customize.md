# 自定义 DuoyunUI

DuoyunUI 与 TapUI 共享主题、图标和文本，参考 [自定义 TapUI](https://tap-ui.gemjs.org/zh/guide/customize)。
同样的 API 也可以从 `duoyun-ui/lib/*` 导入：

```ts
import { theme } from 'duoyun-ui/lib/theme';
import { icons } from 'duoyun-ui/lib/icons';
import { locale } from 'duoyun-ui/lib/locale';
```

`duoyun-ui/lib/theme` 会在 TapUI 主题之上应用 DuoyunUI 的主题值，
只使用直接来自 TapUI 的元素时，需要手动导入它。
