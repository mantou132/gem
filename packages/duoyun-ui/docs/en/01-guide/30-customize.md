# Customization

DuoyunUI shares themes, icons and texts with TapUI, see [TapUI Customization](https://tap-ui.gemjs.org/en/guide/customize).
The same APIs are available from `duoyun-ui/lib/*`:

```ts
import { theme } from 'duoyun-ui/lib/theme';
import { icons } from 'duoyun-ui/lib/icons';
import { locale } from 'duoyun-ui/lib/locale';
```

`duoyun-ui/lib/theme` applies the DuoyunUI theme values on top of the TapUI theme,
import it manually when only using elements that come directly from TapUI.
