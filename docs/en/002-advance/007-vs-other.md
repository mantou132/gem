# Compare other libraries and frameworks

Gem borrows ideas from other frameworks/libraries, but Gem still has many unique features.

## React/Vue

### Template

React uses [JSX](https://reactjs.org/docs/introducing-jsx.html), Vue has a unique [template syntax](https://vuejs.org/v2/guide/syntax.html), Gem Use [lit-html](https://github.com/Polymer/lit-html), native js syntax

### Event

React uses `Prop` to call the parent component method, Vue and Gem both support event propagation, Gem uses native [`CustomEvent`](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/CustomEvent), it also works well when used across frames. Gem provides a Typescript decorator to trigger events easily:

```ts
import { emitter, Emitter, GemElement } from '@mantou/gem';

class MyElement extends GemElement {
  @emitter load: Emitter;
}
```

Calling the `load` method is like calling the `click` method, which will trigger the `load` event on the element, and you can use `@load` for event monitoring in the parent element.

### Performance

React calculates the vDOM of the entire component when it needs to be updated, then finds the DOM/Node that needs to be modified through comparison, and finally writes it to the DOM/Node. Gem uses a completely different method, see lit-html [document](https://github.com/Polymer/lit-html/wiki/How-it-Works), before mounting, lit-html found the DOM/Node corresponding to the data in the template string. When updating, directly put the content on the target DOM/Node. In addition, Gem uses ShadowDOM, when re-calling `render`, the content of custom elements in the template will be skipped. They are only notified of updates by the Attribute/Property/Store of the element "Observe", which will cause the Gem App to be updated in batches. There is a small task management cost.

Using Gem may cause too much ShadowDOM, which may slow down the speed of the App.

## Lit-Element

[`LitElement`](https://lit-element.polymer-project.org/) and `GemElment` work very similarly,
But [API](../002-API/) has a big difference in design.
