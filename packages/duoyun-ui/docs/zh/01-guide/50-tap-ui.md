# 来自 TapUI

DuoyunUI 基于 [TapUI](https://tap-ui.gemjs.org/zh/guide/) 构建，许多模块直接从 TapUI 导出，
它们的文档在 TapUI 中维护。仍然从 `duoyun-ui` 导入即可，API 相同：

```ts
// 等同于 `@mantou/tap-ui/lib/time`
import { Time } from 'duoyun-ui/lib/time';
```

## 元素

这些元素与 TapUI 元素的 API 相同，只有标签名不同。
DuoyunUI 为它们应用了自己的主题，其中一些还有桌面端样式，例如控件高度。

| DuoyunUI                              | TapUI                                                                         | 桌面端样式     |
| ------------------------------------- | ----------------------------------------------------------------------------- | -------------- |
| `<dy-badge>`                          | [`<tap-badge>`](https://tap-ui.gemjs.org/zh/elements/badge)                   |                |
| `<dy-banner>`                         | [`<tap-banner>`](https://tap-ui.gemjs.org/zh/elements/banner)                 |                |
| `<dy-checkbox>` `<dy-checkbox-group>` | [`<tap-checkbox>`](https://tap-ui.gemjs.org/zh/elements/checkbox)             | ✓              |
| `<dy-code-block>`                     | [`<tap-code-block>`](https://tap-ui.gemjs.org/zh/elements/code-block)         |                |
| `<dy-collapse>` `<dy-collapse-panel>` | [`<tap-collapse>`](https://tap-ui.gemjs.org/zh/elements/collapse)             | ✓              |
| `<dy-compartment>`                    | [`<tap-compartment>`](https://tap-ui.gemjs.org/zh/elements/compartment)       |                |
| `<dy-countdown>`                      | [`<tap-countdown>`](https://tap-ui.gemjs.org/zh/elements/countdown)           |                |
| `<dy-divider>`                        | [`<tap-divider>`](https://tap-ui.gemjs.org/zh/elements/divider)               |                |
| `<dy-empty>`                          | [`<tap-empty>`](https://tap-ui.gemjs.org/zh/elements/empty)                   |                |
| `<dy-input>` `<dy-input-group>`       | [`<tap-input>`](https://tap-ui.gemjs.org/zh/elements/input)                   | ✓              |
| `<dy-letters>`                        | [`<tap-letters>`](https://tap-ui.gemjs.org/zh/elements/letters)               |                |
| `<dy-link>` `<dy-active-link>`        | [`<tap-link>`](https://tap-ui.gemjs.org/zh/elements/link)                     |                |
| `<dy-modal>`                          | [`<tap-dialog>`](https://tap-ui.gemjs.org/zh/elements/dialog)                 | ✓              |
| `<dy-options>`                        | [`<tap-options>`](https://tap-ui.gemjs.org/zh/elements/options)               |                |
| `<dy-paragraph>`                      | [`<tap-paragraph>`](https://tap-ui.gemjs.org/zh/elements/paragraph)           |                |
| `<dy-placeholder>`                    | [`<tap-placeholder>`](https://tap-ui.gemjs.org/zh/elements/placeholder)       |                |
| `<dy-radio>` `<dy-radio-group>`       | [`<tap-radio>`](https://tap-ui.gemjs.org/zh/elements/radio)                   | ✓              |
| `<dy-rate>`                           | [`<tap-rate>`](https://tap-ui.gemjs.org/zh/elements/rate)                     |                |
| `<dy-rolling-number>`                 | [`<tap-rolling-number>`](https://tap-ui.gemjs.org/zh/elements/rolling-number) |                |
| `<dy-scroll-box>`                     | [`<tap-scroll-box>`](https://tap-ui.gemjs.org/zh/elements/scroll-box)         |                |
| `<dy-segmented>`                      | [`<tap-segmented>`](https://tap-ui.gemjs.org/zh/elements/segmented)           |                |
| `<dy-slider>`                         | [`<tap-slider>`](https://tap-ui.gemjs.org/zh/elements/slider)                 | ✓              |
| `<dy-space>`                          | [`<tap-space>`](https://tap-ui.gemjs.org/zh/elements/space)                   |                |
| `<dy-stepper>`                        | [`<tap-stepper>`](https://tap-ui.gemjs.org/zh/elements/stepper)               | ✓              |
| `<dy-switch>`                         | [`<tap-switch>`](https://tap-ui.gemjs.org/zh/elements/switch)                 | ✓              |
| `<dy-tag>`                            | [`<tap-tag>`](https://tap-ui.gemjs.org/zh/elements/tag)                       |                |
| `<dy-toast>`                          | [`<tap-toast>`](https://tap-ui.gemjs.org/zh/elements/toast)                   | ✓              |

`duoyun-ui/elements/modal` 和 `duoyun-ui/elements/toast` 导出的 `Modal` 和 `Toast` 等同于 TapUI 中的 `Dialog` 和 `Toast`。

[`<dy-button>`](../02-elements/button.md) 和 [`<dy-list>`](../02-elements/list.md) 在 TapUI 元素的基础上增加了桌面端功能，它们有单独的文档。

## 基类

`DuoyunResizeBaseElement`、`DuoyunScrollBaseElement` 和 `DuoyunVisibleBaseElement` 是 TapUI 基类的别名，
参考[基类](https://tap-ui.gemjs.org/zh/guide/base-class)。

## 其他模块

`duoyun-ui/lib/*` 和 `duoyun-ui/locales/*` 中的所有模块都从 TapUI 导出，参考[不是元素的模块](https://tap-ui.gemjs.org/zh/guide/lib)。
`duoyun-ui/lib/theme` 还会应用 DuoyunUI 的主题值。

## 辅助模块

`duoyun-ui/helper/webapp` 和 `duoyun-ui/helper/error` 基于 TapUI 的基础辅助模块，参考 [Web 应用](https://tap-ui.gemjs.org/zh/guide/app)：
- `initApp` 不包含 TapUI 的移动端设置，它将 `template` 渲染到 `body` 中，`initWindowSize` 用于在应用安装后设置窗口尺寸
- `duoyun-ui/helper/error` 使用 `Toast` 显示错误
