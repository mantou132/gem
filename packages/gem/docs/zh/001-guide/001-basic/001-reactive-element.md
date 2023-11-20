# 反应性元素

当你想要创建一个反应性的 WebApp 时，
你需要元素能对不同的输入（attribute/property/[store](./003-global-state-management.md)）做出反应，即重新渲染。

## 定义

定义具备反应性的 attribute，使用标准的 [observedAttributes](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements#Using_the_lifecycle_callbacks) 静态属性：

```js
// 省略导入...

class MyElement extends GemElement {
  static observedAttributes = ['first-name'];
  render() {
    return html`${this.firstName}`;
  }
}
customElements.define('my-element', MyElement);
```

`first-name` 属性经过“Observe”，他就能直接通过元素属性进行访问，
且会自动进行驼峰和烤串格式的转换，
当 `first-name` 属性更改时，`MyElement` 的实例元素将重新渲染。

类似 `observedAttributes`，GemElement 还支持 `observedProperties`/`observedStores` 用来反应指定的 property/store：

```js
// 省略导入...

class MyElement extends GemElement {
  static observedProperties = ['data'];
  static observedStores = [store];

  render() {
    return html`${this.data.id} ${store.name}`;
  }
}
customElements.define('my-element', MyElement);
```

_不要在元素内修改 prop/attr，他们应该由父元素单向传递进来，就像原生元素一样_

另外 `GemElement` 提供了类似 React 的 `state`/`setState` API 来管理元素自身的状态，
每当调用 `setState` 时触发元素重新渲染：

```js
// 省略导入...

class MyElement extends GemElement {
  state = { id: 1 };
  clicked() {
    this.setState({ id: 2 });
  }
  render() {
    return html`${this.state.id}`;
  }
}
customElements.define('my-element', MyElement);
```

_`GemElement` 扩展自 [`HTMLElement`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement)，不要覆盖 `HTMLElement` 的 attribute/property/method/event，使用[私有字段](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Private_class_fields)来避免 `GemElement`/`HTMLElement` 的属性方法被覆盖_

## 例子

<gbp-sandpack dependencies="@mantou/gem">

```js index.js
import { createStore, GemElement, updateStore, render, html } from '@mantou/gem';

const store = createStore({
  count: 0,
});

class MyElement extends GemElement {
  static observedStores = [store];
  static observedAttributes = ['name'];
  static observedProperties = ['data'];

  #onClick = () => {
    updateStore(store, { count: ++store.count });
  };

  render() {
    return html`
      <button @click="${this.#onClick}">Hello, ${this.name}</button>
      <div>clicked count: ${store.count}</div>
      <pre>${JSON.stringify(this.data)}</pre>
    `;
  }
}
customElements.define('my-element', MyElement);

render(html`<my-element name="world" .data=${{ a: 1 }}></my-element>`, document.body);
```

</gbp-sandpack>

## 生命周期

你可以为 GemElement 指定生命周期函数，有时候他们会很有用，例如：

```js
// 省略导入...

class MyElement extends GemElement {
  mounted() {
    console.log('element mounted!');
  }
}
customElements.define('my-element', MyElement);
```

完整的生命周期：

```
  +-------------+       +----------------------+
  | constructor |       |attr/prop/store update|
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

_父元素的 `constructor` 和 `unmounted` 先于子元素执行，但 `mounted` 后于子元素执行_

## 使用 TypeScript

当使用 TypeScript 时，可以在声明字段的同时使用装饰器进行反应性声明：

```ts
// 省略导入...

const store = createStore({
  count: 0,
});

@customElement('my-element')
@connectStore(store)
class MyElement extends GemElement {
  @attribute name: string;
  @boolattribute disabled: boolean;
  @numattribute count: number;
  @property data: Data | undefined; // property 没有默认值
}
```
