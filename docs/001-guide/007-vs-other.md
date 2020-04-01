# 对比其他库和框架

## React/Vue

### 模版

React 使用 [JSX](https://reactjs.org/docs/introducing-jsx.html)，Vue 有独特的[模板语法](https://vuejs.org/v2/guide/syntax.html)，Gem 使用 [lit-html](https://github.com/Polymer/lit-html)，原生 js 语法

### 事件

React 中使用 `Prop` 调用父组件方法，Vue 和 Gem 都支持事件传播，Gem 使用原生 [`CustomEvent`](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/CustomEvent)，跨框架使用时也能很好的工作。

Gem 提供一个 Typescript 装饰器，以便方便的触发事件：

```ts
import { emitter } from '@mantou/gem';

class MyElement extends GemElement {
  @emitter load: Function;
}
```

调用 `load` 方法就好像调用 `click` 方法，将在元素上触发 `load` 事件，在父元素中可以使用 `@load` 进行事件监听。

### 性能

React 在需要更新时计算整个组件的 vDOM，然后通过比较找到需要修改的 DOM/Node，最后写到 DOM/Node 上，
Gem 使用完全不同的方式，参见 lit-html [文档](https://github.com/Polymer/lit-html/wiki/How-it-Works)，
在挂载前， lit-html 找到了模板字符串中的数据对应的 DOM/Node，在更新时，直接将内容需要目标 DOM/Node 上，
另外，Gem 使用 ShadowDOM，在重新调用 `render` 时，会跳过模板中的自定义元素的内容，
他们只由该元素“Observe”的 Attribute/Property/Store 通知更新，这会造成 Gem App 是分批次列队更新，
有少许的任务管理成本。

## Lit-Element

[`LitElement`](https://lit-element.polymer-project.org/) 和 `GemElment` 的工作方式很相似，
但是 [API](../002-API/002-gem-element) 设计有一些区别，`GemElement` 以简单为原则设计 API。
