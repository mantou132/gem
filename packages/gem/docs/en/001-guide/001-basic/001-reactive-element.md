# Reactive element

When you want to create a reactive WebApp, you need elements that can react(re-render) to different inputs (attribute/property/[store](./003-global-state-management.md)).

## Definition

Define reactive attributes, using standard static property [observedAttributes](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements#Using_the_lifecycle_callbacks):

```js
// Omit import...

@customElement('my-element')
class MyElement extends GemElement {
  @attribute firstName;
  render() {
    return html`${this.firstName}`;
  }
}
```

In the above example, the field `firstName` of `MyElement` is declared as a reactive property.
When this property change, the mounted instance of `MyElement` will re-render,
additionally, this field maps to the element's `first-name` Attribute.

Similar to `@attribute`, GemElement also supports `@property`/`@connectStore` to reflect the specified Property/Store:

```js
// Omit import...

@customElement('my-element')
@connectStore(store)
class MyElement extends GemElement {
  @property data;

  render() {
    return html`${this.data.id} ${store.name}`;
  }
}
```

> [!TIP]
> Do not modify prop/attr within the element, they should be passed in one-way by the parent element, just like native elements

In addition, `GemElement` provides React-like `state`/`setState` API to manage the state of the element itself. an element re-rendered is triggered whenever `setState` is called:

```js
// Omit import...

@customElement('my-element')
class MyElement extends GemElement {
  state = { id: 1 };
  clicked() {
    this.setState({ id: 2 });
  }
  render() {
    return html`${this.state.id}`;
  }
}
```

> [!TIP] `GemElement` extends from [`HTMLElement`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement), don’t override the attribute/property/method/event, use [private fields](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Private_class_fields) to avoid overwriting the property/methods of `GemElement`/`HTMLElement`

## Example

<gbp-sandpack dependencies="@mantou/gem">

```js index.js
import {
  useStore,
  GemElement,
  render,
  html,
  attribute,
  property,
  connectStore,
  customElement,
} from '@mantou/gem';

const [store, update] = useStore({
  count: 0,
});

@customElement('my-element')
@connectStore(store)
class MyElement extends GemElement {
  @attribute name;
  @property data;

  #onClick = () => {
    update({ count: ++store.count });
  };

  render() {
    return html`
      <button @click="${this.#onClick}">Hello, ${this.name}</button>
      <div>clicked count: ${store.count}</div>
      <pre>${JSON.stringify(this.data)}</pre>
    `;
  }
}

render(
  html`<my-element name="world" .data=${{ a: 1 }}></my-element>`,
  document.getElementById('root'),
);
```

</gbp-sandpack>

## Life cycle

You can specify life cycle functions for GemElement. Sometimes they are useful, for example:

```js
// Omit import...

@customElement('my-element')
class MyElement extends GemElement {
  mounted() {
    console.log('element mounted!');
  }
}
```

Complete life cycle:

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

> [!NOTE]
> The `constructor` and `unmounted` of the parent element are executed before the child element, but the `mounted` is executed after the child element
