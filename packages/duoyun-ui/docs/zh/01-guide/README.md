# 简介

DuoyunUI 是使用 [Gem](https://gemjs.org/) 开发的桌面端中后台 Web UI 库，它具有 70+ 自定义元素，
除了支持常用功能外，还能轻松完成多语言、自定义主题、键盘访问等需求。DuoyunUI 旨在提供一套轻量、高性能、功能全面、[跨框架](https://custom-elements-everywhere.com/)的 UI 库。

<gbp-media src="/preview.png"></gbp-media>

> DuoyunUI 有部分元素的设计参考了 [Adobe Spectrum](https://spectrum.adobe.com) 和 [AntD](https://ant.design/)

## 元素分类

- 表单元素
  > [`<dy-cascader-pick>`](../02-elements/cascader-pick.md), [`<dy-cascader>`](../02-elements/cascader.md), [`<dy-checkbox>`](../02-elements/checkbox.md), [`<dy-color-panel>`](../02-elements/color-panel.md), [`<dy-color-pick>`](../02-elements/color-pick.md), [`<dy-date-panel>`](../02-elements/date-panel.md), [`<dy-date-pick>`](../02-elements/date-pick.md), [`<dy-date-range-panel>`](../02-elements/date-range-panel.md), [`<dy-date-range-pick>`](../02-elements/date-range-pick.md), [`<dy-drop-area>`](../02-elements/drop-area.md), [`<dy-file-pick>`](../02-elements/file-pick.md), [`<dy-form>`](../02-elements/form.md), [`<dy-input>`](../02-elements/input.md), [`<dy-pick>`](../02-elements/pick.md), [`<dy-radio>`](../02-elements/radio.md), [`<dy-rating>`](../02-elements/rating.md), [`<dy-select>`](../02-elements/select.md), [`<dy-shortcut-record>`](../02-elements/shortcut-record.md), [`<dy-slider>`](../02-elements/slider.md), [`<dy-switch>`](../02-elements/switch.md), [`<dy-time-panel>`](../02-elements/time-panel.md)
- 动作元素
  > [`<dy-action-text>`](../02-elements/action-text.md), [`<dy-button>`](../02-elements/button.md), [`<dy-copy>`](../02-elements/copy.md), [`<dy-link>`](../02-elements/link.md), [`<dy-menu>`](../02-elements/menu.md), [`<dy-options>`](../02-elements/options.md)
- 反馈元素
  > [`<dy-coach-mark>`](../02-elements/coach-mark.md), [`<dy-drawer>`](../02-elements/drawer.md), [`<dy-help-text>`](../02-elements/help-text.md), [`<dy-input-capture>`](../02-elements/input-capture.md), [`<dy-keyboard-access>`](../02-elements/keyboard-access.md), [`<dy-loading>`](../02-elements/loading.md), [`<dy-meter>`](../02-elements/meter.md), [`<dy-modal>`](../02-elements/modal.md), [`<dy-page-loadbar>`](../02-elements/page-loadbar.md), [`<dy-placeholder>`](../02-elements/placeholder.md), [`<dy-popover>`](../02-elements/popover.md), [`<dy-progress>`](../02-elements/progress.md), [`<dy-status-light>`](../02-elements/status-light.md), [`<dy-toast>`](../02-elements/toast.md), [`<dy-tooltip>`](../02-elements/tooltip.md), [`<dy-wait>`](../02-elements/wait.md)
- 导航元素
  > [`<dy-breadcrumbs>`](../02-elements/breadcrumbs.md), [`<dy-pagination>`](../02-elements/pagination.md), [`<dy-side-navigation>`](../02-elements/side-navigation.md)
- 内容展示元素
  > [`<dy-avatar>`](../02-elements/avatar.md), [`<dy-banner>`](../02-elements/banner.md), [`<dy-calendar>`](../02-elements/calendar.md), [`<dy-card>`](../02-elements/card.md), [`<dy-code-block>`](../02-elements/code-block.md), [`<dy-collapse>`](../02-elements/collapse.md), [`<dy-compartment>`](../02-elements/compartment.md), [`<dy-divider>`](../02-elements/divider.md), [`<dy-empty>`](../02-elements/empty.md), [`<dy-heading>`](../02-elements/heading.md), [`<dy-image-preview>`](../02-elements/image-preview.md), [`<dy-list>`](../02-elements/list.md), [`<dy-more>`](../02-elements/more.md), [`<dy-paragraph>`](../02-elements/paragraph.md), [`<dy-result>`](../02-elements/result.md), [`<dy-space>`](../02-elements/space.md), [`<dy-statistic>`](../02-elements/statistic.md), [`<dy-table>`](../02-elements/table.md), [`<dy-tabs>`](../02-elements/tabs.md), [`<dy-tag>`](../02-elements/tag.md), [`<dy-timeline>`](../02-elements/timeline.md), [`<dy-tree>`](../02-elements/tree.md)
- 图表元素
  > [`<dy-area-chart>`](../02-elements/area-chart.md), [`<dy-bar-chart>`](../02-elements/bar-chart.md), [`<dy-chart-tooltip>`](../02-elements/chart-tooltip.md), [`<dy-chart-zoom>`](../02-elements/chart-zoom.md), [`<dy-donut-chart>`](../02-elements/donut-chart.md), [`<dy-legend>`](../02-elements/legend.md), [`<dy-line-chart>`](../02-elements/line-chart.md), [`<dy-map>`](../02-elements/map.md), [`<dy-scatter-chart>`](../02-elements/scatter-chart.md)
- 基类（扩展它们创建自己的自定义元素）
  > `DuoyunLoadableBaseElement`, `DuoyunResizeBaseElement`, `DuoyunScrollBaseElement`, `DuoyunVisibleBaseElement`

## 使用方法

### NPM

安装：

```sh
npm install duoyun-ui
```

使用自定义元素：

```ts
import { render } from '@mantou/gem';

import 'duoyun-ui/elements/color-pick';

render(html`<dy-color-pick></dy-color-pick>`, document.body);
```

使用元素 API：

```ts
import { Toast } from 'duoyun-ui/elements/toast';

Toast.open('error', '发生了一个错误');
```

### ESM

DuoyunUI 支持以 ESM 的方法独立使用某一个元素，例如为你的网站添加键盘访问（`f` 列出所有可聚焦元素）：

```ts
import('https://jspm.dev/duoyun-ui/elements/keyboard-access').then(({ DuoyunKeyboardAccessElement }) =>
  document.body.append(new DuoyunKeyboardAccessElement()),
);
```

例如启用录屏模式：

```ts
import('https://jspm.dev/duoyun-ui/elements/input-capture').then(({ DuoyunInputCaptureElement }) =>
  document.body.append(new DuoyunInputCaptureElement()),
);
```

## 当前状态

- DuoyunUI 处于早起开发状态，可能有部分元素遗漏，部分元素由于缺少实践可能存在设计缺陷
- 没有设计系统背书，用户体验还需要提升

## 路线图

- Logo 设计
- 完善现有元素，规范化 API
- 添加缺失元素和功能
- 添加更多的语言支持
