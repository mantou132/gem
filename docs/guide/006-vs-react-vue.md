# 与 React/Vue 比较

## 模版

React 使用 jsx，Vue 有独特的语法，gem 使用 lit-html，原生 js 语法

## 事件

React 中使用 `Prop` 调用父组件方法，Vue 和 gem 都支持事件传播，gem 使用原生 `[CustomEvent](docs/Web/API/CustomEvent/CustomEvent)`，在传递时要主要 ShadowDOM 边界。

gem 提供一个 ts 装饰器，以便方便都触发事件：

```ts
import { emitter } from '@mantou/gem';

class MyElement extends GemElement {
  @emitter load: Function;
}
```

调用 `load` 方法就好像调用 `click` 方法，将在元素上触发 `load` 事件，在父元素中可以使用 `@load` 进行事件监听。
