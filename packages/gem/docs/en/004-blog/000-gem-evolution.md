# Gem Evolution

With [WebComponents](https://developer.mozilla.org/en-US/docs/Web/Web_Components) officially supported by various browsers, Gem began to sprout, from the earliest component abstraction to the current complete WebApp development Program.

## Realization idea

Affected by React, declarative writing of UI components has become popular. Using ES6 template strings, you can get a development experience similar to JSX. Use [`innerHTML`](https://developer.mozilla.org/en-US/docs/Web/API/Element/innerHTML) to parse the template into DOM, after traversing the parsed DOM, you can bind the variables in the ES6 template string with Node to achieve the purpose of updating components. For this, Gem uses [lit-html](https://lit.dev/docs/templates/overview/) as a template engine.

```js
render(html`<div>${name}</div>`, document.body);
```

The scope of CSS is global. In order to obtain an independent component-based development experience, solutions such as CSS modules or CSS in JS are often used. Gem uses [ShadowDOM](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_shadow_DOM) of custom elements to achieve this purpose, you can write `<style>` directly in ShadowDOM without considering issues such as CSS conflicts.

[Custom Elements](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements) `observedAttributes` and `attributeChangedCallback` can implement callbacks to update elements when attributes are updated, ES6 template literals [tag function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#Tagged_templates) constant array parameter also makes it possible to call the rendering function repeatedly and only update the changed part.

```js
class Component extends HTMLElement {
  constructor() {
    super();
    this._shadowRoot = this.attachShadow({ mode: 'open' });
  }

  render() {
    return html``;
  }

  connectedCallback() {
    render(this.render(), this._shadowRoot);
  }

  attributeChangedCallback() {
    render(this.render(), this._shadowRoot);
  }
}

class MyElement extends Component {
  static get observedAttributes() {
    return ['name'];
  }

  render() {
    return html`<div>${this.getAttribute('name')}</div>`;
  }
}

customElements.define('my-element', MyElement);
```

In addition, define the `observedProperties` static fields to declare the Properties subject to "observe", and define them as `getter`/`setter` in the constructor, so that they can have the same opportunity to execute callbacks to re-render the content when they are updated like `attributeChangedCallback`.

In addition to `observedProperties`, it also defines the `observedStores` static field, which declares some special objects(Store) to be observed, binds the update method of the element instance to the Store in the constructor, and executes the bound update method in the update Store to re-render Element content. Store can be used to share data between components and conduct centralized global data management.

## JS implementation

Based on the above ideas, you can write a [complete](https://github.com/mantou132/mt-music-player/blob/master/fe/lib/component.js) `Component` base class, based on the native [Life Cycle](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements#Using_the_lifecycle_callbacks) defines the following life cycles:

- willMount
- render
- mounted
- shouldUpdate
- updated
- unmounted
- attributeChanged

They can execute user-defined callbacks during different periods of element mounting, updating, and mounting, and native lifecycle callbacks are used to perform some internal work of Component.

`Component` also defines a `setState` method, which simulates React's `setState`, but actually just calls the internal update method after `Object.assign` updates the element's `state` property.

In addition, `Component` synchronizes Attribute to Property, and use `this.name` to read `name` Attribute.

## TS support

In large front-end projects, using TypeScript is a very suitable choice. At this time, it is troublesome for `Component` to use TypeScript. You can "observe" that the declaration and type declaration are repeated:

```ts
class MyElement extends Component {
  static get observedAttributes() {
    return ['name'];
  }

  static get observedProperties() {
    return ['data'];
  }

  name: string;
  data: { result: string[] } | undefined;

  render() {
    return html`<div>${this.name}</div>`;
  }
}

customElements.define('my-element', MyElement);
```

To this end, Gem defines a series of decorators that declare the "observe" attributes of elements in a very simple way:

```ts
@customElement('my-element')
class MyElement extends GemElement {
  @attribute name: string;
  @property data: { result: string[] } | undefined;

  render() {
    return html`<div>${this.name}</div>`;
  }
}
```

In addition, `Component` has also been renamed to `GemElement`.

## Abandon `attributeChanged`

When an element needs to perform some side effects based on an attribute (such as obtaining remote data), you need to use `attributeChanged`, which is similar to `attributeChangedCallback`, which can execute callbacks when the attributes are updated, and judge the updated attributes to perform corresponding actions in the callback:

```ts 6-8
@customElement('my-element')
class MyElement extends GemElement {
  // ...

  attributeChanged(name) {
    if (name === 'name') {
      // do something
    }
  }
}
```

The biggest problem with this approach is hard coding. In order to avoid hard coding, `GemElement` implements the `effect` method, which checks the specified dependency(can be any value) after each update of the element, and executes it if the dependency is updated. Callback:

```ts 6-11
@customElement('my-element')
class MyElement extends GemElement {
  // ...

  mounted() {
    this.effect(
      () => {
        // do something
      },
      () => [this.name],
    );
  }
}
```

## Implement other requirements

- [Built-in custom elements](../003-api/005-built-in-element.md): Gem built-in `<gem-route>`, `<gem-link>`, `<gem-title> `, `<gem-use>`, `<gem-unsafe>` and `<gem-reflect>`
- Internationalization support
- Theme support
- [DevTools](https://github.com/mantou132/gem-devtools/)

## Using ES Decorators

Decorators have become standardized and are incompatible with the previous decorator specifications, so it is necessary to abandon the previous TypeScript implementation of decorators in favor of [using standardized decorators](./006-es-decorators.md), while maintaining the same API. Additionally, constructor parameters have also been changed to use decorator descriptions and deprecate `setState`; for more details, please read [v2 Introduction](./007-v2-intro.md).

## Work in progress

- Analyze `GemElement` and generate jsdoc description or custom element data to support automatic document generation
- IDE integration optimization
- Improve building
