# From TapUI

DuoyunUI is built on [TapUI](https://tap-ui.gemjs.org/en/guide/), many modules are re-exported from TapUI,
their documentation is maintained in TapUI. Import them from `duoyun-ui` as usual, the API is the same:

```ts
// same as `@mantou/tap-ui/lib/time`
import { Time } from 'duoyun-ui/lib/time';
```

## Elements

These elements have the same API as the TapUI elements, only the tag name is different.
DuoyunUI applies its theme to them, and some of them also have desktop styles, such as control height.

| DuoyunUI                              | TapUI                                                                         | Desktop styles |
| ------------------------------------- | ----------------------------------------------------------------------------- | -------------- |
| `<dy-badge>`                          | [`<tap-badge>`](https://tap-ui.gemjs.org/en/elements/badge)                   |                |
| `<dy-banner>`                         | [`<tap-banner>`](https://tap-ui.gemjs.org/en/elements/banner)                 |                |
| `<dy-checkbox>` `<dy-checkbox-group>` | [`<tap-checkbox>`](https://tap-ui.gemjs.org/en/elements/checkbox)             | ✓              |
| `<dy-code-block>`                     | [`<tap-code-block>`](https://tap-ui.gemjs.org/en/elements/code-block)         |                |
| `<dy-collapse>` `<dy-collapse-panel>` | [`<tap-collapse>`](https://tap-ui.gemjs.org/en/elements/collapse)             | ✓              |
| `<dy-compartment>`                    | [`<tap-compartment>`](https://tap-ui.gemjs.org/en/elements/compartment)       |                |
| `<dy-countdown>`                      | [`<tap-countdown>`](https://tap-ui.gemjs.org/en/elements/countdown)           |                |
| `<dy-divider>`                        | [`<tap-divider>`](https://tap-ui.gemjs.org/en/elements/divider)               |                |
| `<dy-empty>`                          | [`<tap-empty>`](https://tap-ui.gemjs.org/en/elements/empty)                   |                |
| `<dy-input>` `<dy-input-group>`       | [`<tap-input>`](https://tap-ui.gemjs.org/en/elements/input)                   | ✓              |
| `<dy-letters>`                        | [`<tap-letters>`](https://tap-ui.gemjs.org/en/elements/letters)               |                |
| `<dy-link>` `<dy-active-link>`        | [`<tap-link>`](https://tap-ui.gemjs.org/en/elements/link)                     |                |
| `<dy-modal>`                          | [`<tap-dialog>`](https://tap-ui.gemjs.org/en/elements/dialog)                 | ✓              |
| `<dy-options>`                        | [`<tap-options>`](https://tap-ui.gemjs.org/en/elements/options)               |                |
| `<dy-paragraph>`                      | [`<tap-paragraph>`](https://tap-ui.gemjs.org/en/elements/paragraph)           |                |
| `<dy-placeholder>`                    | [`<tap-placeholder>`](https://tap-ui.gemjs.org/en/elements/placeholder)       |                |
| `<dy-radio>` `<dy-radio-group>`       | [`<tap-radio>`](https://tap-ui.gemjs.org/en/elements/radio)                   | ✓              |
| `<dy-rate>`                           | [`<tap-rate>`](https://tap-ui.gemjs.org/en/elements/rate)                     |                |
| `<dy-rolling-number>`                 | [`<tap-rolling-number>`](https://tap-ui.gemjs.org/en/elements/rolling-number) |                |
| `<dy-scroll-box>`                     | [`<tap-scroll-box>`](https://tap-ui.gemjs.org/en/elements/scroll-box)         |                |
| `<dy-segmented>`                      | [`<tap-segmented>`](https://tap-ui.gemjs.org/en/elements/segmented)           |                |
| `<dy-slider>`                         | [`<tap-slider>`](https://tap-ui.gemjs.org/en/elements/slider)                 | ✓              |
| `<dy-space>`                          | [`<tap-space>`](https://tap-ui.gemjs.org/en/elements/space)                   |                |
| `<dy-stepper>`                        | [`<tap-stepper>`](https://tap-ui.gemjs.org/en/elements/stepper)               | ✓              |
| `<dy-switch>`                         | [`<tap-switch>`](https://tap-ui.gemjs.org/en/elements/switch)                 | ✓              |
| `<dy-tag>`                            | [`<tap-tag>`](https://tap-ui.gemjs.org/en/elements/tag)                       |                |
| `<dy-toast>`                          | [`<tap-toast>`](https://tap-ui.gemjs.org/en/elements/toast)                   | ✓              |

`Modal` and `Toast` exported by `duoyun-ui/elements/modal` and `duoyun-ui/elements/toast` are the same as `Dialog` and `Toast` in TapUI.

[`<dy-button>`](../02-elements/button.md) and [`<dy-list>`](../02-elements/list.md) extend TapUI elements with desktop features, they have their own pages.

## Base classes

`DuoyunResizeBaseElement`, `DuoyunScrollBaseElement` and `DuoyunVisibleBaseElement` are aliases of the TapUI base classes,
see [Base classes](https://tap-ui.gemjs.org/en/guide/base-class).

## Other modules

All modules in `duoyun-ui/lib/*` and `duoyun-ui/locales/*` are re-exported from TapUI, see [Other modules](https://tap-ui.gemjs.org/en/guide/lib).
`duoyun-ui/lib/theme` additionally applies the DuoyunUI theme values.

## Helpers

`duoyun-ui/helper/webapp` and `duoyun-ui/helper/error` are based on the TapUI base helpers, see [Web App](https://tap-ui.gemjs.org/en/guide/app):
- `initApp` doesn't apply the mobile settings of TapUI, it renders `template` into `body`, and `initWindowSize` sets the window size when the app is installed
- `duoyun-ui/helper/error` shows errors with `Toast`
