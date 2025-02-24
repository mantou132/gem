# 对比其他库

Gem 借鉴了其他库的思想，但 Gem 还是有很多独特之处。

### 能力

Gem 是针对 Web 环境的库，所以它能满足 WebApp 的常见需求，而不需要安装其他依赖，
但是 Gem 不包含 UI 库，也不能一键为你搭建项目。

### 开发体验

不像其他库，Gem 只使用 JavaScript/Typescript 编写 WebApp 的任何部分，所以它没有语法糖，
完成同样的功能需要更多的代码，当然这也是 Gem 的优势之一，你不需要学习额外的语言。

如果要获得更好的体验，例如模板诊断，需要像使用其他库一样安装 IDE 插件和构建插件。

### 性能

React 在需要更新时计算整个组件的 vDOM，然后通过比较找到需要修改的 DOM/Node，最后写到 DOM/Node 上，
Gem 使用完全不同的方式，参见 lit-html [文档](https://github.com/lit/lit/blob/main/dev-docs/design/how-lit-html-works.md)，
在挂载前， lit-html 找到了模板字符串中的数据对应的 DOM/Node，在更新时，直接将内容需要目标 DOM/Node 上，
另外，Gem 使用 ShadowDOM，在重新调用 `render` 时，会跳过模板中的自定义元素的内容，
他们只由该元素“Observe”的 Attribute/Property/Store 通知更新，这会造成 Gem App 是分批次列队更新，
有少许的任务管理成本。

使用 Gem 可能会造成过多的 ShadowDOM，这可能会减慢 App 的速度。

### SEO

Gem 不能进行服务端渲染，只能通过预渲染的方法为搜索引擎提供有效索引。
