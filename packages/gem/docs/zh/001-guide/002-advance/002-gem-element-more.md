# GemElement 更多内容

除了 attr/prop/store/state 外的特性。

## 引用 DOM

如果你想要在元素内操作 DOM 内容，例如读取 `<input>` 的值，你可以使用 `querySelector` 来获取你想要的元素，
为了获得 TypeScript 的类型支持，GemElement 提供了一种方法完成这项工作：

```ts
// 省略导入...

@customElement('my-element')
class MyElement extends GemElement {
  @refobject inputRef: RefObject<HTMLInputElement>;

  render() {
    return html`<input ref=${this.inputRef.ref} />`;
  }

  mounted() {
    console.log(this.inputRef.element.value);
  }
}
```

_不能和 `<gem-reflect>` 一起使用_

## 自定义事件

自定义事件是一种传递数据的方法，使用 `dispatch(new CustomEvent('event'))` 能轻松完成，同样为了获得 TypeScript 的类型支持，
GemElement 允许快速定义方法来触发自定义事件：

```ts
// 省略导入...

@customElement('my-element')
class MyElement extends GemElement {
  @emitter valueChange: Emitter<string>;

  render() {
    return html`<input @change=${(e) => this.valueChange(e.target.value)} />`;
  }
}
```

接收自定义事件时，您仍然需要手写事件名称：

```ts
html` <my-element @value-change=${console.log}></my-element>`;
```

## 副作用

很多时候，元素需要根据某个属性执行一些副作用，比如网络请求，最后来更新文档。
这是 `GemElement.effect` 就派上用场了，它能在元素每次 `updated` 后检查依赖，如果依赖发生变化就会执行回调。

```ts
// 省略导入...

@customElement('my-element')
class MyElement extends GemElement {
  @attribute src: string;

  mounted() {
    this.effect(
      () => fetch(this.src),
      () => [this.src],
    );
  }
}
```

下面是依赖子元素的 `effect` 例子（[其他实现](https://twitter.com/youyuxi/status/1327328144525848577?s=20)）：

<gbp-raw src="/src/examples/effect/index.ts"></gbp-raw>

## Memo

类似 Effect，`memo` 能在需要时执行回调函数：

```ts
// 省略导入...

@customElement('my-element')
class MyElement extends GemElement {
  @attribute src: string;

  #href: string;

  willMount() {
    this.memo(
      () => this.#href = new URL(this.src, location.origin).href,
      () => [this.src],
    );
  }
}
```
