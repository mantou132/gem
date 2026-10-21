# Gem 适合什么项目？

Gem 是基于 Web Components 平台构建应用和可复用元素的库，围绕标准 HTML、CSS、JavaScript 和浏览器的自定义元素工作。

## 从简单元素到完整应用

Gem 是分层的，可以按项目需要选用相应能力：
- **轻量自定义元素封装**：组合使用 `@mantou/gem/lib/reactive` 和 `@mantou/gem/lib/decorators`，不引入 lit-html 模板引擎。简单元素可以直接操作 DOM，保持较小的构建体积。
- **可复用组件和 UI 库**：使用 `@mantou/gem/lib/element` 引入 `GemElement` 和模板引擎。产物仍是标准自定义元素；[gem-port](https://github.com/mantou132/gem/tree/main/packages/gem-port) 可以生成 React、Vue 和 Svelte 包装组件。
- **完整应用**：`@mantou/gem` 提供路由、history、Store 等应用能力。需要应用框架、基于文件的路由、布局、页面数据和预渲染时，可以加上 [gemkit](https://github.com/mantou132/gem/tree/main/packages/gemkit)；[gem-ssr](https://github.com/mantou132/gem/tree/main/packages/gem-ssr) 提供 SSR 基础能力。

## 按使用场景选择 DOM 模式

开发可复用的 UI 库组件时，优先使用 Shadow DOM 封装组件内部样式；开发应用时，优先使用 Light DOM，方便应用级 CSS 和 Tailwind CSS 等工具类作用于页面内容。Gem 默认使用 Light DOM；需要 Shadow DOM 时，在组件上使用 `@shadow()`。

## 适合使用 Gem 的场景

- 想构建可复用的自定义元素，并在普通 HTML 和不同框架中使用。
- 想用自定义元素开发 WebApp，并在 Gem 生态中使用响应式状态、路由和主题能力。
- 喜欢基于 HTML 模板和标准 JavaScript 的写法，而不是 JSX、Vue 模板或 Svelte 模板。

## 需要考虑的取舍

- Gem 使用 lit-html 标签模板字符串，而不是 JSX、Vue 模板或 Svelte 模板。团队熟悉这些 DSL 时，可能需要适应 Gem 的模板写法。
- Gem 核心不包含现成的 UI 组件，可以使用 [DuoyunUI](https://github.com/mantou132/gem/tree/main/packages/duoyun-ui) 或自行开发。
- JavaScript 项目使用核心运行时不需要专门的编译器。TypeScript 检查、模板诊断和 HMR 需要配置相应的 TypeScript、编辑器和构建插件，详见[开发指南](./008-development.md)。

## 深入了解具体用法

- [Gem 和 Lit](../../004-blog/009-gem-vs-lit.md)：比较两者的元素模型、样式、模板和迁移注意事项。
- [从 React 迁移到 Gem](../../004-blog/008-migrate-from-react.md)：介绍如何把 React 项目迁移到 Gem。
- 共享样式和 Tailwind CSS 的用法见[样式化元素](../001-basic/006-styled-element.md)。
