---
isNav: true
navTitle: Guide
---

# Reactive element

When you want to create a reactive WebApp, you need elements that can react (re-render) to different inputs (attribute/property/[store](./003-global-state-management)).

## Definition

Define reactive attributes, using standard static property [observedAttributes](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements#Using_the_lifecycle_callbacks):

```js
// Omit import...

class HelloWorld extends GemElement {
  static observedAttributes = ['first-name'];
  render() {
    return html`${this.firestName}`;
  }
}
```

After the `first-name` attribute is "Observed", he can directly access it through property, and it will automatically convert the kebab-case and camelCase format, when the `first-name` property is changed, the instance element of `HelloWorld` will be re-rendered.

Similar to `observedAttributes`, GemElement also supports `observedPropertys`/`observedStores` to reflect the specified property/store:

```js
// Omit import...

class HelloWorld extends GemElement {
  static observedPropertys = ['data'];
  static observedStores = [store];
  render() {
    return html`${this.data.id} ${store.name}`;
  }
}
```

_Do not modify prop/attr within the element, they should be passed in one-way by the parent element, just like native elements_

In addition, `GemElement` provides React-like `state`/`setState` API to manage the state of the element itself. an element re-rendered is triggered whenever `setState` is called:

```js
// Omit import...

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

_`GemElement` extends from [`HTMLElement`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement), don’t override the attribute/property/method/event, use [private fields](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Private_class_fields) to avoid overwriting the property/methods of `GemElement`/`HTMLElement`_

## Example

```js
// Omit import...

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

## Life cycle

You can specify life cycle functions for GemElement. Sometimes they are useful, for example:

```js
// Omit import...

class HelloWorld extends GemElement {
  mounted() {
    console.log('element mounted!');
  }
}
```

Complete life cycle:

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

## Use TypeScript

When using TypeScript, you can use decorators to make reactive declarations while declaring fields:

```ts
// Omit import...

const store = createStore({
  count: 0,
});

@customElement('hello-world')
@connectStore(store)
class HelloWorld extends GemElement {
  @attribute name: string;
  @boolattribute disabled: boolean;
  @numattribute count: number;
  @property data: Data | undefined; // property has no default value
}
```
