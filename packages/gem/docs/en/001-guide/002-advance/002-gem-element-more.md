# GemElement more

Features other than Attribute/Property/Store/State.

## Template syntax extension

Gem has made many modifications to [lit-html](https://lit.dev/docs/templates/overview/) and built some common functions without passing directive.

### Reference DOM

If you want to manipulate the DOM content within an element, such as reading the value of `<input>`, you can use `querySelector` to get the element you want, in order to get the type support of TypeScript, GemElement provides `createRef` to complete this work:

```js
// Omit import...

@customElement('my-element')
class MyElement extends GemElement {
  #inputRef = createRef();

  render = () => {
    return html`<input ${this.#inputRef} />`;
  }

  focus = () => {
    this.#inputRef.value.focus();
  }
}
```

### Rest properties

Sometimes, when passing properties to an element through parameters, a lot of repetitive code needs to be written, for example:

```js
const { prop1, prop2, prop3 } = props;

html`<my-element .prop1=${prop1} .prop2=${prop2} .prop3=${prop3}></my-element>`
```

Gem supports rest properties, similar to React: 

```js
html`<my-element ${...props}></my-element>`
```

### Conditional rendering

In development, conditional rendering is often encountered, and it is usually written like this:

```js
html`${isA ? html`<div>a</div>` : isB ? html`<div>b</div>` : html`<div>c</div>`}`
```

This has low readability, so Gem supports v-if, resembling Vue:

```js
html`
  <div v-if=${isA}>a</div>
  <div v-else-if=${isB}>b</div>
  <div v-else>c</div>
`
```

> [!NOTE]
> Compared to the original approach, using v-if incurs a slight performance loss during element initialization, as those elements that will not render will still have their parameters parsed and created.
     

## Custom event

Custom event is a method of transferring data. It can be easily done by using `dispatch(new CustomEvent('event'))`. To obtain TypeScript type support, GemElement allows you to quickly define methods to emit custom events:

```js
// Omit import...

@customElement('my-element')
class MyElement extends GemElement {
  @emitter valueChange;

  render = () => {
    return html`<input @change=${(e) => this.valueChange(e.target.value)} />`;
  }
}
```

Add custom event handler:

```js
html`<my-element @value-change=${console.log}></my-element>`;
```

## Effect

In many cases, elements need to perform some side effects based on certain attributes, such as network requests, and finally update the document. This is where `@effect` comes in handy. It can check dependencies every time the element is render and execute a callback if the dependencies change.

```js
// Omit import...

@customElement('my-element')
class MyElement extends GemElement {
  @attribute src;

  @effect((i) => [i.src])
  #fetch = () => fetch(this.src);
}
```

Below is an example of `effect` that depends on child elements([Other implementations](https://twitter.com/youyuxi/status/1327328144525848577?s=20)):

<gbp-sandpack dependencies="@mantou/gem">

```js index.js
import { resizeEffect } from './effect.js';

@customElement('app-root')
export class App extends GemElement {
  #ref = createRef();
  #state = createState({ height: 0, visible: true });

  @effect((i) => [i.#ref.value])
  #resize = resizeEffect((height) => {
    this.#state({ height });
  });

  render() {
    const { visible, height } = this.#state;
    return html`
      <button @click=${() => this.#state({ visible: !visible})}>
        ${visible ? 'hidden' : 'show'}
      </button>
      <div>${height}</div>
      <textarea v-if=${visible} ${this.#ref}></textarea>
    `;
  }
}
```

```js effect.js
export function resizeEffect(callback) {
  return ([ele]) => {
    if (!ele) return callback(0);
    const ro = new ResizeObserver(([entry]) => {
      callback(entry.contentRect.height);
    });
    ro.observe(ele, {});
    return () => ro.disconnect();
  }
}
```

```html index.html
<app-root></app-root>
```

</gbp-sandpack>

## Memo

In order to avoid performing some complex calculations when rerender, `@memo` can execution of the callback when specified dependencies change, unlike the `effect`, `memo` execution before the render.

```js
// Omit import...

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
> - `@memo` supports `getter`, but decorators spec does [not currently support private names](https://github.com/tc39/proposal-decorators/issues/509), this restriction can be release using [SWC plugin](../002-advance/009-building.md).
> - The decorators `@effect` and `@memo` are based on `GemElement.effect` and `GemElement.memo`. If necessary, `effect` and `memo` can be dynamically added using `GemElement.effect` and `GemElement.memo`
