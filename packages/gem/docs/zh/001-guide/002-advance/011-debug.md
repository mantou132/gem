# 调试

GemElement 是标准的自定义元素，能在浏览器 DevTools 中检查和调试。也可以安装 [Gem DevTools](https://chrome.google.com/webstore/detail/gem-devtools/lgfpciakeemopebkmjajengljoakjfle) 扩展，它能让你更直观的检查和修改 Gem 元素的数据。

## 使用 Gem DevTools

安装后，在浏览器 DevTools 的 **Elements** 面板中打开 **Gem** 侧边栏。

![Gem DevTools](https://raw.githubusercontent.com/mantou132/gem/main/packages/gem-devtools/screenshot/firefox.jpg)

### 检查元素

在 Elements 面板中选中 Gem 元素后，侧边栏会分类显示它的成员：

- 被观察的 Attribute、Property、Store，挂载的样式和元素状态
- Emitter、Slot、CSS 状态、Part 和方法
- 未被观察的 Attribute、Property，以及类的静态成员

简单类型（字符串、数字、布尔值）的值可以直接编辑；点击 **Inspect** 可以在 Elements 面板中定位 DOM 值，或在 Console 中打印对象。

选中非 Gem 元素时，侧边栏会显示页面中所有元素、自定义元素和 Gem 元素的统计信息。

页面中有 `<iframe>` 时，可以通过侧边栏顶部的下拉框切换要检查的 frame。

### 扫描渲染

页面使用了 Gem 时，侧边栏顶部会显示 **Scan** 按钮。点击后，页面中每个元素渲染时都会用方框高亮并显示渲染次数（例如 `x3`），约一秒后淡出。

扫描可以让不必要的渲染变得直观，例如元素连接的 `Store` 更新范围过大，导致大量元素一起更新，参见[规划 Store](../001-basic/003-global-state-management.md)。刷新页面即可停止扫描。
