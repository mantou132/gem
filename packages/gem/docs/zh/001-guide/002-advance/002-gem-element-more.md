# GemElement 更多内容

除了 Attribute/Property/Store/State 外的特性。

## 模板语法扩展

Gem 对 [lit-html](https://lit.dev/docs/templates/overview/) 进行了很多修改，将一些常用功能内置而不需要通过指令。

### 引用 DOM

如果你想要在元素内操作 DOM 内容，例如读取 `<input>` 的值，你可以使用 `querySelector` 来获取你想要的元素，
为了获得 TypeScript 的类型支持，GemElement 提供了 `createRef` 完成这项工作：

```js
// 省略导入...

@customElement('my-element')
class MyElement extends GemElement {
  #inputRef = createRef();

  render() {
    return html`<input ${this.#inputRef} />`;
  }

  focus() {
    this.#inputRef.value.focus();
  }
}
```

### 剩余属性

有时候属性通过参数传递到元素上，需要写很多重复代码，比如：

```js
const { prop1, prop2, prop3 } = props;

html`<my-element .prop1=${prop1} .prop2=${prop2} .prop3=${prop3}></my-element>`
```

Gem 支持剩余属性，写法类似 React：

```js
html`<my-element ${...props}></my-element>`
```

### 条件渲染

开发中经常会遇到条件渲染，一般会这样写：

```js
html`${isA ? html`<div>a</div>` : isB ? html`<div>b</div>` : html`<div>c</div>`}`
```

这样的可读性很低，所以 Gem 支持了 `v-if`，写法类似 Vue：

```js
html`
  <div v-if=${isA}>a</div>
  <div v-else-if=${isB}>b</div>
  <div v-else>c</div>
`
```

> [!NOTE]
> 相比原来的写法，使用 `v-if` 会损失一点点性能，在元素初始化时，那些不会渲染的元素也会参数解析、创建。

## 自定义事件

自定义事件是一种传递数据的方法，使用 `dispatch(new CustomEvent('event'))` 能轻松完成，为了获得 TypeScript 的类型支持，
GemElement 允许快速定义方法来触发自定义事件：

```js
// 省略导入...

@customElement('my-element')
class MyElement extends GemElement {
  @emitter valueChange;

  render() {
    return html`<input @change=${(e) => this.valueChange(e.target.value)} />`;
  }
}
```

添加自定义事件处理程序：

```js
html`<my-element @value-change=${console.log}></my-element>`;
```

## 副作用

很多时候，元素需要根据某个属性执行一些副作用，比如网络请求，最后来更新文档。
这时 `@effect` 就派上用场了，它能在元素每次渲染后检查依赖，如果依赖发生变化就会执行回调。

```js
// 省略导入...

@customElement('my-element')
class MyElement extends GemElement {
  @attribute src;

  @effect((i) => [i.src])
  #fetch = () => fetch(this.src);
}
```

下面是依赖子元素的 `@effect` 例子（[其他框架实现](https://twitter.com/youyuxi/status/1327328144525848577?s=20)）：

<gbp-raw src="https://raw.githubusercontent.com/mantou132/gem/main/packages/gem-examples/src/effect/index.ts"></gbp-raw>

## Memo

为了避免在重新渲染时执行一些复杂的计算，`@memo` 能在指定依赖变更时执行回调函数，和 `@effect` 不同的是，他在渲染之前执行。

```js
// 省略导入...

@customElement('my-element')
class MyElement extends GemElement {
  @attribute src;

  #href;
  @memo((i) => [i.src])
  #updateHref = () => (this.#href = new URL(this.src, location.origin).href);
}
```

> [!NOTE]
>
> - `@memo` 支持 `getter`，但装饰器暂[不支持私有名称](https://github.com/tc39/proposal-decorators/issues/509)，使用 [SWC 插件](../002-advance/009-building.md)可以解除这一限制。
> - 装饰器 `@effect` `@memo` 基于 `GemElement.effect` 和 `GemElement.memo`，有必要时，可以使用 `GemElement.effect` 和 `GemElement.memo` 动态添加 `effect` 和 `memo`。
