# 下沉基础到 TapUI

DuoyunUI 面向桌面端中后台，而 [TapUI](https://github.com/mantou132/gem/tree/main/packages/tap-ui) 面向移动端优先体验。两者共享同一套 Gem 体系，因此把「可复用的基础能力」从 DuoyunUI 下沉到 TapUI，让上层只保留差异化的桌面 UI。

## 下沉了什么

近期下沉主要包括：

- **工具与主题**：`lib/*`、`locales/*`、部分 `helper/*`（此前已完成）
- **基类**：`VisibleBaseElement` / `ResizeBaseElement`（DuoyunUI 仍以原名再导出，兼容旧导入）
- **列表核心**：无限滚动、虚拟化渲染等放在 `<tap-list>`；`<dy-list>` 继承它，并保留默认的桌面条目渲染（头像、标题、描述等）

关系可以粗略看成：

```text
TapUI          基础能力、轻量交互、可复用结构
  └─ DuoyunUI  桌面视觉、默认渲染、中后台组件与模式
```

使用者仍然通过 `duoyun-ui` 引入即可；底层会依赖 `tap-ui`。

## 定制 UI：Class Token

下沉之后，更理想的定制方式不是复制整份模板，而是：

1. 在 TapUI（或基础实现）里用 `css({})` **暴露 class token**
2. 在 DuoyunUI（或业务侧）用 **同一 token 作为选择器** 叠加样式

TapUI 中定义并在模板里挂上 class：

```ts
import { css, html, GemElement } from '@mantou/gem/lib/element';
import { adoptedStyle, customElement } from '@mantou/gem/lib/decorators';
import { styled } from '@mantou/gem/lib/utils';

export const styles = css({
  div: styled`
    color: blue;
  `,
});

@customElement('tap-demo')
@adoptedStyle(styles)
export class TapDemoElement extends GemElement {
  render = () => html`<div class=${styles.div}>TapUI</div>`;
}
```

DuoyunUI（或上层）在同一 class token 上追加样式——例如加粗、放大——而不改动结构：

```ts
import { css } from '@mantou/gem/lib/element';
import { adoptedStyle, customElement } from '@mantou/gem/lib/decorators';
import { styles, TapDemoElement } from 'tap-ui/elements/demo';

const dyStyles = css({
  [styles.div]: `
    font-weight: bold;
    font-size: 2em;
  `,
});

@customElement('dy-demo')
@adoptedStyle(dyStyles)
export class DuoyunDemoElement extends TapDemoElement {}
```

要点：

- `styles.div` 既是模板里的 **class 名**，也是上层样式表里的 **选择器 key**
- 上层只声明差异样式；结构与默认行为仍在 TapUI
- DuoyunUI 适合继续叠加主题色、间距、默认 `renderItem` 等「桌面语义」

这也是 `<dy-list>` 一类组件后续演进的方向：核心交互在 TapUI，视觉与默认渲染在 DuoyunUI，通过 class token（以及既有的 `::part` / 主题变量）做分层定制。

## 小结

把基础下沉到 TapUI，是为了：

- 移动端与桌面端共享列表虚拟化、可见性/尺寸观测等基础设施
- 让 DuoyunUI 专注桌面体验与默认 UI
- 用 class token 做可组合的样式定制，而不是分叉实现

后续新组件会按「TapUI 提供结构与 token → DuoyunUI 定制外观」这一约定落地。
