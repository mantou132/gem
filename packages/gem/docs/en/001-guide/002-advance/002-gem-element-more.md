# GemElement more

Features other than Attribute/Property/Store/State.

## Reference DOM

If you want to manipulate the DOM content within an element, such as reading the value of `<input>`, you can use `querySelector` to get the element you want, in order to get the type support of TypeScript, GemElement provides `createRef` to complete this work:

```js
// Omit import...

@customElement('my-element')
class MyElement extends GemElement {
  #inputRef = createRef();

  render() {
    return html`<input ${this.#inputRef} />`;
  }

  focus() {
    this.#inputRef.value.focus();
  }
}
```

## Custom event

Custom event is a method of transferring data. It can be easily done by using `dispatch(new CustomEvent('event'))`. Also in order to obtain TypeScript type support, GemElement allows you to quickly define methods to emit custom events:

```js
// Omit import...

@customElement('my-element')
class MyElement extends GemElement {
  @emitter valueChange;

  render() {
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

Below is an example of `effect` that depends on child elements([Other implementations](https://twitter.com/youyuxi/status/1327328144525848577?s=20))

<gbp-raw src="https://raw.githubusercontent.com/mantou132/gem/main/packages/gem-examples/src/effect/index.ts"></gbp-raw>

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
> - `@memo` supports `getter`, but does [not currently support private names](https://github.com/tc39/proposal-decorators/issues/509)
> - The decorators `@effect` and `@memo` are based on `GemElement.effect` and `GemElement.memo`. If necessary, `effect` and `memo` can be dynamically added using `GemElement.effect` and `GemElement.memo`
