---
isNav: true
navTitle: 指南
---

# 反应性元素

当你想要创建一个反应性的 WebApp 时，
你需要元素能对不同的输入（attribute/property/[store](./003-global-state-management)）做出反应（重新渲染）。

## 定义

定义具备反应性的 attribute，使用标准的 [observedAttributes](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements#Using_the_lifecycle_callbacks) 静态属性：

```js
// 省略导入...

class HelloWorld extends GemElement {
  static observedAttributes = ['first-name'];
  render() {
    return html`${this.firestName}`;
  }
}
```

`first-name` 属性经过“Observed”，他就能直接通过 property 进行访问，
且会自动进行驼峰和烤串格式的转换，
当 `first-name` 属性更改时，`HelloWorld` 的实例元素将重新渲染。

类似 `observedAttributes`，GemElement 还支持 `observedPropertys`/`observedStores` 用来反应指定的 property/store：

```js
// 省略导入...

class HelloWorld extends GemElement {
  static observedPropertys = ['data'];
  static observedStores = [store];
  render() {
    return html`${this.data.id} ${store.name}`;
  }
}
```

_不要在元素内修改 prop/attr，他们应该由父元素单向传递进来，就像原生元素一样_

另外 `GemElement` 提供了类似 React 的 `state`/`setState` API 来管理元素自身的状态，
每当调用 `setState` 时触发元素重新渲染：

```js
// 省略导入...

class HelloWorld extends GemElement {
  state = { id: 1 };
  clicked() {
    this.setState({ id: 2 });
  }
  render() {
    return html`${this.state.id}`;
  }
}
```

_`GemElement` 扩展自 [`HTMLElement`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement)，不要覆盖 `HTMLElement` 的 attribute/property/method/event，使用[私有字段](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Private_class_fields)来避免 `GemElement`/`HTMLElement` 的属性方法被覆盖_

## 例子

```js
// 省略导入...

const store = createStore({
  count: 0,
});

class HelloWorld extends GemElement {
  static observedStores = [store];
  static observedAttributes = ['name'];
  static observedPropertys = ['data'];

  clickHandle = () => {
    updateStore(store, { count: ++store.count });
  };
  render() {
    return html`
      <button @click="${this.clickHandle}">Hello, ${this.name}</button>
      <div>clicked clount: ${store.count}</div>
      <pre>${JSON.stringify(this.data)}</pre>
    `;
  }
}
```

[![Edit reactive-element](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/reactive-element-chu75?fontsize=14&hidenavigation=1&theme=dark)

## 生命周期

你可以为 GemElement 指定生命周期函数，有时候他们会很有用，例如：

```js
// 省略导入...

class HelloWorld extends GemElement {
  mounted() {
    console.log('element mounted!');
  }
}
```

完整的生命周期：

```
  +-------------+       +----------------------+
  |  construct  |       |attr/prop/store update|
  +-------------+       +----------------------+
         |                         |
         |                         |
  +------v------+         +--------v-------+
  |  willMount  |         |  shouldUpdate  |
  +-------------+         +----------------+
         |                         |
         |                         |
  +------v-------------------------v------+
  |                render                 |
  +---------------------------------------+
         |                         |
         |                         |
  +------v------+           +------v------+
  |   mounted   |           |   updated   |
  +-------------+           +-------------+
         |                         |
         |                         |
  +------v-------------------------v------+
  |               unmounted               |
  +---------------------------------------+
```

## 使用 TypeScript

当使用 TypeScript 时，可以在声明字段的同时使用装饰器进行反应性声明：

```ts
// 省略导入...

const store = createStore({
  count: 0,
});

@customElement('hello-world')
@connectStore(store)
class HelloWorld extends GemElement {
  @attribute name: string;
  @boolattribute disabled: boolean;
  @numattribute count: number;
  @property data: Data | undefined; // property 没有默认值
}
```
