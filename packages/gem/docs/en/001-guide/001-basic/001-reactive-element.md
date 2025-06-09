# Reactive element

When you want to create a reactive WebApp, you need elements that can react(re-render) to different inputs (attribute/property).

## Definition

Define reactive Attribute, using decorator `@attribute`:

```js
// Omit import...

@customElement('my-element')
class MyElement extends GemElement {
  @attribute firstName;

  render = () => {
    return html`${this.firstName}`;
  }
}
```

In the above example, the field `firstName` of `MyElement` is declared as a reactive property.
When this property change, the mounted instance of `MyElement` will re-render,
additionally, this field maps to the element's `first-name` Attribute.

Similar to `@attribute`, GemElement also provides `numattribute` `boolattribute` to support Number and Boolean values. And `@property` is used to reflect the specified Property:

```js
// Omit import...

@customElement('my-element')
class MyElement extends GemElement {
  @property data;

  render = () => {
    return html`${this.data.id} ${store.name}`;
  }
}
```

> [!TIP]
> - Do not modify prop/attr within the element, they should be passed in one-way by the parent element, just like native elements
> - `GemElement` extends from [`HTMLElement`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement), don’t override the attribute/property/method/event, use [private fields](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Private_class_fields) to avoid overwriting the property/methods of `GemElement`/`HTMLElement`

In addition, Gem provides the `createState` API to create the element's own state, and the created state object also acts as an update function, triggering the element to re-render when called.

## Example

<gbp-sandpack dependencies="@mantou/gem">

```js index.js
@customElement('my-element')
class MyElement extends GemElement {
  @attribute name;

  #state = createState({ count: 1 });

  #clicked = () => {
    this.#state({ count: ++this.#state.count });
  }

  render = () => {
    return html`
      <button @click=${this.#clicked}>
        ${this.name}:
        Clicked ${this.#state.count} times
      </button>
    `;
  }
}
```

```html index.html
<my-element name="World"></my-element>
<my-element name="Friend"></my-element>
```

</gbp-sandpack>

## Life cycle

> [!WARNING]
> The lifecycle may be [replaced](https://github.com/mantou132/gem/issues/159) in the future by decorators based on `@effect` `@memo` `@willMount` `@template` `@mounted` `@unmounted`

You can specify life cycle functions for GemElement. Sometimes they are useful, for example:

```js
// Omit import...

@customElement('my-element')
class MyElement extends GemElement {
  mounted = () => {
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
         |                   (shouldUpdate)
         |                         |
  +------v-------------------------v------+
  |            @memo(willMount)           |
  +---------------------------------------+
         |                         |
         |                         |
  +------v-------------------------v------+
  |           @template(render)           |
  +---------------------------------------+
         |                         |
         |                         |
  +------v-------------------------v------+
  |  @effect(mounted/updated/unmounted)   |
  +---------------------------------------+
```

> [!NOTE]
> The `constructor` and `unmounted` of the parent element are executed before the child element, but the `mounted` is executed after the child element
