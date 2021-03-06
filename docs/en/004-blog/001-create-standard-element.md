# Create standard and reliable custom elements

> It is recommended to use TypeScript to write, the examples in this article also use TypeScript

The custom elements created can be used in any framework and can be created in a variety of ways. When you want to expose your custom elements, you need to design carefully.

### Element name

The first thing to consider when creating a custom element is to define a suitable element name, because duplicate element names are not allowed in the entire document. So you should define a clear naming method in your project:

```html
<!-- Library-Component -->
<gem-link></gem-link>
<gem-route></gem-route>

<!-- Application-Type-Component -->
<portal-page-user></portal-page-user>
<portal-module-profile></portal-module-profile>
<portal-ui-checkbox></portal-ui-checkbox>
```

Their class name should correspond to the element name, because directly using the constructor is also a way to create elements:

```ts
new GemLinkElement();
new PortalPageUserElement();
new PortalModuleProfileElement();
```

### Attribute or Property

When using Gem to create a custom element, you can define Attribute and Property. Both of them can pass data to the element, and both can make them "observable", that is, when their values are changed, they will trigger element updates. But Attribute can be expressed by Markup, machine readable, and can be directly edited in the browser DevTools, and Attribute has default values, which is very convenient when used inside the element, so if you can use the data represented by Attribute, try to use Attribute. Property is only used for data types not supported by Attribute.

```ts
@customElement('portal-module-profile')
class PortalModuleProfileElement extends GemElement {
  @attribute name: string;
  @numattribute age: number;
  @boolattribute vip: boolean;

  @property data?: Data;
}
```

### Public or Private

When using TypeScript to write Gem elements, their fields and methods are all `public` by default. Although you can use the `private` modifier to mark them as private, they are still public in JavaScript and can be accessed outside the element. In order to prevent users from accidentally using these fields and methods, you should use [Private Fields](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Private_class_fields) in JavaScript:

```ts
@customElement('my-element')
class MyElement extends GemElement {
  #valid = false;
  #process = () => {
    //
  };
}
```

Another advantage of using private fields is that they won't have the same name as `GemElement`/`HTMLelement` attributes or methods, which has high benefits when developing complex elements.

### `addEventListener` or `onclick`

You can use event handler property when adding native DOM event listeners inside elements:

```ts
@customElement('my-element')
class MyElement extends GemElement {
  onclick = console.log;
}
```

Never use this method, because they have many disadvantages:

- According to [ES Semantics](https://github.com/tc39/proposal-class-fields#public-fields-created-with-objectdefineproperty), it will not work
- Can be overridden and cancelled outside the element

So you should use `addEventListener` to register event handlers:

```ts
@customElement('my-element')
class MyElement extends GemElement {
  constructor() {
    this.addEventListener('click', console.log);
  }
}
```

### Handling element errors

When an error occurs in an element, the error should be propagated in an event mode, so that the external event listener can be used to handle the error:

```ts
@customElement('my-element')
class MyElement extends GemElement {
  @emitter error: Emitter<string>;

  async #fetchData() {
    try {
      //...
    } catch {
      this.error('fetch fail...');
    }
  }
}
```

### Performance

When using Gem to write custom elements, ShadowDOM is used by default, which has the excellent feature of isolating CSS:

```ts
@customElement('my-element')
class MyElement extends GemElement {
  render() {
    return html`
      <style>
        :host {
          display: contents;
        }
      </style>
    `;
  }
}
```

This is equivalent to creating a `<style>` element in each `<my-element>`. If it is a static style, you should try to use [Constructable Stylesheet](https://wicg.github.io/construct-stylesheets/) , It has better performance and lower memory usage:

```ts
const style = createCSSSheet(css`
  :host {
    display: contents;
  }
`);
@customElement('my-element')
@adoptedStyle(style)
class MyElement extends GemElement {}
```

If you need to render many instances at once, you can use `isAsync` to create asynchronous rendering elements, which can avoid blocking the main thread during rendering and guarantee 60fps:

```ts
@customElement('my-element')
class MyElement extends GemElement {
  constructor() {
    super({ isAsync: ture });
  }
}
```
