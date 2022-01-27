# 简介

DuoyunUI 是使用 [Gem](https://gem.js.org/) 开发的桌面端中后台 Web UI 库，它具有 70+ 自定义元素，
除了支持常用功能外，还能轻松完成多语言、自定义主题、键盘访问等需求。DuoyunUI 旨在提供一套轻量、高性能、功能全面、[跨框架](https://custom-elements-everywhere.com/)的 UI 库。

> DuoyunUI 有部分元素的设计参考了 [Adobe Spectrum](https://spectrum.adobe.com) 和 [AntD](https://ant.design/)

## 元素分类

- 表单元素
  > `<dy-cascader-pick>`, `<dy-cascader>`, `<dy-checkbox>`, `<dy-color-panel>`, `<dy-color-pick>`, `<dy-date-panel>`, `<dy-date-pick>`, `<dy-date-range-panel>`, `<dy-date-range-pick>`, `<dy-drop-area>`, `<dy-file-pick>`, `<dy-form>`, `<dy-input>`, `<dy-pick>`, `<dy-radio>`, `<dy-rating>`, `<dy-select>`, `<dy-shortcut-record>`, `<dy-slider>`, `<dy-switch>`, `<dy-time-panel>`
- 动作元素
  > `<dy-action-text>`, `<dy-button>`, `<dy-copy>`, `<dy-link>`, `<dy-menu>`, `<dy-options>`
- 反馈元素
  > `<dy-coach-mark>`, `<dy-drawer>`, `<dy-help-text>`, `<dy-input-capture>`, `<dy-keyboard-access>`, `<dy-loading>`, `<dy-meter>`, `<dy-modal>`, `<dy-page-loadbar>`, `<dy-placeholder>`, `<dy-popover>`, `<dy-progress>`, `<dy-status-light>`, `<dy-toast>`, `<dy-tooltip>`, `<dy-wait>`
- 导航元素
  > `<dy-breadcrumbs>`, `<dy-pagination>`, `<dy-side-navigation>`
- 内容展示元素
  > `<dy-avatar>`, `<dy-banner>`, `<dy-calendar>`, `<dy-card>`, `<dy-code-block>`, `<dy-collapse>`, `<dy-compartment>`, `<dy-divider>`, `<dy-empty>`, `<dy-heading>`, `<image-preview>`, `<dy-list>`, `<dy-more>`, `<dy-paragraph>`, `<dy-result>`, `<dy-space>`, `<dy-statistic>`, `<dy-table>`, `<dy-tabs>`, `<dy-tag>`, `<dy-timeline>`, `<dy-tree>`
- 图表元素
  > `<dy-area-chart>`, `<dy-bar-chart>`, `<dy-chart-tooltip>`, `<dy-chart-zoom>`, `<dy-donut-chart>`, `<dy-legend>`, `<dy-line-chart>`, `<dy-map>`, `<dy-scatter-chart>`
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

使用单实例元素：

```ts
import { Toast } from 'duoyun-ui/elements/toast';

Toast.open('error', '发生了一个错误');
```

### ESM

DuoyunUI 支持以 ESM 的方法独立使用某一个元素，例如为你的网站添加键盘访问（`f` 列出所有可聚焦元素）：

```ts
import('https://cdn.skypack.dev/duoyun-ui/elements/keyboard-access').then(({ DuoyunKeyboardAccessElement }) =>
  document.body.append(new DuoyunKeyboardAccessElement()),
);
```

例如启用录屏模式：

```ts
import('https://cdn.skypack.dev/duoyun-ui/elements/input-capture').then(({ DuoyunInputCaptureElement }) =>
  document.body.append(new DuoyunInputCaptureElement()),
);
```

## 当前状态

- DuoyunUI 处于早起开发状态，可能有部分元素遗漏，部分元素由于缺少实践可能存在设计缺陷
- 没有设计系统背书，用户体验还需要提升

## 路线图

- Logo 设计
- 添加示例
- 编写 API 文档（Gem 元素[自动文档生成](https://github.com/mantou132/gem-book/commit/5cfb05d64313a4bda55edfa2fcfe6cfbc5db67cb)）
- 完善现有元素， 规范化 API
- 添加缺失元素和功能
- 添加更多的语言支持
