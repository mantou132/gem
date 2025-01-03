# GemElement 更多内容

除了 Attribute/Property/Store/State 外的特性。

## 引用 DOM

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

## 自定义事件

自定义事件是一种传递数据的方法，使用 `dispatch(new CustomEvent('event'))` 能轻松完成，同样为了获得 TypeScript 的类型支持，
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
html` <my-element @value-change=${console.log}></my-element>`;
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
> - `@memo` 支持 `getter`，但暂[不支持私有名称](https://github.com/tc39/proposal-decorators/issues/509)
> - 装饰器 `@effect` `@memo` 基于 `GemElement.effect` 和 `GemElement.memo`，有必要时，可以使用 `GemElement.effect` 和 `GemElement.memo` 动态添加 `effect` 和 `memo`。
