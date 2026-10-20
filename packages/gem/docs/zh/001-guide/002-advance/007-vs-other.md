# 对比其他库

Gem 借鉴了其他库的思想，但 Gem 还是有很多独特之处。和 Lit 的详细对比请看[这篇博客](../../004-blog/009-gem-vs-lit.md)。

### 能力

Gem 是针对 Web 环境的库，所以它能满足 WebApp 的常见需求，例如路由、全局状态、主题，而不需要安装其他依赖。
Gem 核心不包含 UI 库和应用框架，它们由 [DuoyunUI](https://github.com/mantou132/gem/tree/main/packages/duoyun-ui) 和 [gemkit](https://github.com/mantou132/gem/tree/main/packages/gemkit) 提供。

### 开发体验

不像其他库，Gem 只使用 JavaScript/Typescript 编写 WebApp 的任何部分，不需要编译就能运行，所以没有 JSX 或者单文件组件这样的语法糖，
完成同样的功能可能需要更多的代码，当然这也是 Gem 的优势之一，你不需要学习额外的语言。
模板中的 `v-if`、Ref、剩余属性等扩展语法也都是在运行时实现的。

如果要获得更好的体验，例如模板诊断，需要像使用其他库一样安装 IDE 插件和构建插件。

### 性能

React 在需要更新时计算整个组件的 vDOM，然后通过比较找到需要修改的 DOM/Node，最后写到 DOM/Node 上，
Gem 使用完全不同的方式，参见 lit-html [文档](https://github.com/lit/lit/blob/main/dev-docs/design/how-lit-html-works.md)，
在挂载前， lit-html 找到了模板字符串中的数据对应的 DOM/Node，在更新时，直接将内容需要目标 DOM/Node 上，
另外，元素重新渲染时，只会更新模板中子元素的 Attribute/Property，子元素的内容由它们自己渲染，
只有该元素“Observe”的 Attribute/Property/Store 发生变化时才会更新，这会造成 Gem App 是分批次列队更新，
有少许的任务管理成本。

需要一次渲染大量元素时，可以使用 `@async()` 让元素渲染不阻塞主线程。

### SEO

使用 [gemkit](https://github.com/mantou132/gem/tree/main/packages/gemkit) 可以进行服务端渲染（SSR）和静态生成（SSG），使用 Shadow DOM 的元素以声明式 ShadowDOM 输出，搜索引擎无需执行 JavaScript 就能索引页面内容，页面标题和 `<meta>` 也会在服务端输出。
