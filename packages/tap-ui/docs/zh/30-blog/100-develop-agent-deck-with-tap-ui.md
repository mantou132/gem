# 使用 TapUI 开发移动端 ACP 客户端：AgentDeck 实战复盘

[AgentDeck](https://github.com/mantou132/agent-deck) 是一个基于 Tauri 2 构建的移动端 ACP (Agent Client Protocol) 客户端，能够将运行在桌面上的 Coding Agents（例如 Claude Code、Codex、Cursor、pi 等）转化为在手机上随时随地触达的远程服务。

在手机小屏和触控交互的约束下，构建一套响应灵敏、符合移动端原生直觉的交互界面并不轻松。AgentDeck 选用 **Gem + TapUI + Tailwind CSS** 作为前端技术栈，本文将复盘我们如何利用 TapUI 的组件体系与移动端基础设施，快速打造出一款丝滑、轻量的移动端应用。

---

## 1. 为什么选择 TapUI？

开发移动端 Web 应用或跨端应用（如 Tauri / Capacitor）时，开发者常常面临几个痛点：

1. **桌面端 UI 库的“水土不服”**：交互尺寸偏小、缺乏专门针对触摸屏的手势反馈与过渡动效。
2. **重型框架与运行时开销**：传统单页应用框架引入了较重的虚拟 DOM 与运行时体积，在低端移动设备上容易出现滚动掉帧或输入延迟。
3. **安全区域与系统条适配繁琐**：iOS 的 Home Indicator、Android 沉浸式导航栏与状态栏的安全区域处理往往需要编写大量胶水代码。

TapUI 是基于 [Gem](https://github.com/mantou132/gem) 实现的面向移动端优先体验的 UI 组件库。它完全基于标准 Web Components，零外部重型依赖，开箱即提供手势交互、页面栈导航、抽屉面板以及安全区域自动适配，非常契合 AgentDeck 的场景诉求。

---

## 2. 移动端基础设施：`initApp` 与安全区域

在入口文件 `src/main.ts` 中，AgentDeck 借助 TapUI 的 `initApp` 工具方法一键完成了移动端宿主环境的初始化：

```ts
import { initApp } from '@mantou/tap-ui/helper/webapp';
import { html } from '@mantou/gem/lib/element';
import { startApp } from './state/app';

initApp({
  template: html`<agentdeck-app class="block h-full"></agentdeck-app>`,
});

startApp();
```

`initApp` 封装了移动端视口（viewport meta）、禁止缩放、防止橡皮筋滚动干扰等通用配置。在结合 `tauri-plugin-edge-to-edge-api` 启用全面屏 Edge-to-Edge 之后，界面能无缝贴合设备边框。

---

## 3. 页面骨架与栈式导航

### `<tap-page>` 与 `<tap-navbar>`

在 AgentDeck 的几乎所有页面（会话列表、会话详情、设置页、文件浏览器）中，我们都采用了 `<tap-page>` 作为基础骨架：

```ts
render = () => {
  return html`
    <tap-page class="bg-bg text-text">
      <tap-navbar
        slot="header"
        title=${this.title}
        back
        @backclick=${() => Stack.pop()}
      ></tap-navbar>

      <!-- 页面主体内容 -->
      <div class="p-4">...</div>
    </tap-page>
  `;
};
```

- `<tap-page>` 内部天然处理了视口与滚动容器，避免了在移动端常见的外层 body 滚动联动错乱。
- `<tap-navbar>` 统一了标题、副标题、返回键及操作区域的对齐与布局规范。

### `Stack` 原生级手势导航

移动端应用的核心交互节奏在于“进入详情”与“手势侧滑返回”。AgentDeck 没有采用复杂的路由机制，而是直接使用了 TapUI 提供的 `Stack` 导航栈：

```ts
import { Stack } from '@mantou/tap-ui/elements/stack';

// 打开会话详情页，并开启侧滑手势返回
export const openSession = (sessionId: string) => {
  Stack.push({
    content: html`
      <agentdeck-session-page class="block h-full" .sessionId=${sessionId}></agentdeck-session-page>
    `,
    gesture: true,
  });
};

// 打开设置页
export const openSettings = () => {
  Stack.push({
    content: html`
      <agentdeck-settings-page class="block h-full" .canGoBack=${true}></agentdeck-settings-page>
    `,
    gesture: true,
  });
};
```

只需声明 `gesture: true`，页面就能获得跟 iOS / Android 原生一致的边缘滑动返回动效和手势跟手效果，极大提升了用户操作的爽快感。

---

## 4. 关键交互组件在业务中的落地

### `<tap-swipeout>`：列表卡片滑动操作

在会话列表（`session-group.ts`）中，用户经常需要对单个历史会话进行快捷删除。我们直接使用 `<tap-swipeout>` 包裹会话条目：

```ts
<tap-swipeout class="overflow-hidden rounded-2xl">
  <div slot="right" class="flex h-full items-stretch">
    <button
      class="flex w-16 items-center justify-center bg-negative text-white"
      @click=${() => this.#deleteSession(session.id)}
    >
      <tap-use class="size-5" .element=${icons.delete}></tap-use>
    </button>
  </div>

  <!-- 会话主卡片 -->
  <div class="session-card">...</div>
</tap-swipeout>
```

手指左滑即可顺滑展开删除按钮，松手或点击自动回弹，不需要任何额外的动画或手势监听代码。

### `<tap-sheet>` 与 `Sheet`：底部抽屉与上下文面板

在小屏幕上，传统的 Modal 弹窗容易遮挡上下文且不利于单手操作。AgentDeck 中各类复杂的子面板（如 MCP 工具执行明细、附件选项、会话信息）全部通过底部抽屉承载：

- 声明式：使用 `<tap-sheet>` 配合 `<tap-reflect .target=${document.body}>` 挂载到根节点。
- 命令式：直接使用 `Sheet.open({ content: ... })` 唤起。

### 内置浏览器与富文本辅助

- **`Browser.open`**：Agent 在回复中产出本地或外部链接时，通过 TapUI 的 `Browser` 模态直接在应用内打开网页，配合 Tauri 代理打通内网调试。
- **`<tap-code-block>`**：用于在移动端高质量展示代码片段和 JSON 调试入参，支持语法高亮与移动端横向滚动。
- **`<tap-carousel>`**：在新手 Relay 配对引导页面中，提供步骤轮播教学展示。

---

## 5. 主题系统与 Tailwind CSS 的无缝融合

AgentDeck 整体使用 Tailwind CSS 组织样式，而 TapUI 自身基于 CSS 自定义属性构建主题。通过 TapUI 提供的 `extendTheme`，两者的协同变得异常简单：

```ts
// src/styles/theme.ts
import { extendTheme } from '@mantou/tap-ui/lib/theme';
import './tailwind.css';

export const agentDeckTheme = extendTheme({
  colorScheme: 'light dark',
  primaryColor: 'var(--color-primary)',
  highlightColor: 'var(--color-highlight)',
  textColor: 'var(--color-text)',
  describeColor: 'var(--color-describe)',
  backgroundColor: 'var(--color-bg)',
  lightBackgroundColor: 'var(--color-bg-light)',
  hoverBackgroundColor: 'var(--color-bg-hover)',
  borderColor: 'var(--color-border)',
  disabledColor: 'var(--color-disabled)',
  normalRound: 'var(--radius-xl)',
});
```

我们只需在 CSS 中定义一套颜色变量，TapUI 的所有内置组件（按钮、开关、输入框、导航栏）与业务侧手写的 Tailwind class 即可共享完全一致的色彩方案和圆角规范，暗黑模式也是开箱自适应。

同时，借助 `extendIcons` 与 `<tap-use>`：

```ts
import { extendIcons } from '@mantou/tap-ui/lib/icons';

export const icons = extendIcons({
  // 覆盖内置图标或扩展专用图标
  settings: rune('...'),
  folder: rune('...'),
});
```

模板中使用 `<tap-use class="size-5" .element=${icons.settings}></tap-use>` 即可优雅引用，保持高灵活性与极致体积。

---

## 6. 移动端实用工具函数

除了 UI 元素，TapUI 还在 `lib/*` 中提供了一系列贴合移动端业务的实用工具：

- **`compressionImage`**：在手机端选择照片或截图作为 Agent prompt 的附件时，先在前端自动压缩，大幅减少上传耗时与 API token 消耗。
- **`Time`**：对会话更新时间进行“刚刚”、“5分钟前”、“昨天”等相对时间友好格式化。
- **`loadLocale`**：异步按需加载国际化语言包，与应用的 i18n 逻辑无缝集成。

---

## 总结

在 AgentDeck 的开发过程中，TapUI 扮演的不仅仅是一个“UI 部件集合”，更是一套**面向移动端交互体验的完整套件**。

从最底层的 `initApp` 视口调优、`Stack` 边缘侧滑手势，到表层的 `<tap-page>`、`<tap-navbar>`、`<tap-sheet>`，TapUI 帮助我们规避了跨端混合应用中最容易踩坑的移动端交互细节，使得开发团队能够把核心精力聚焦于 ACP 协议调度与 Agent 交互体验本身。

如果你也计划基于 Web 技术栈构建轻量、丝滑的移动端或桌面端工具应用，不妨试试 [TapUI](https://github.com/mantou132/gem/tree/main/packages/tap-ui)。
