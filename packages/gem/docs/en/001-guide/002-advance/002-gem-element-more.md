# GemElement more

Features other than attr/prop/store/state.

## Reference DOM

If you want to manipulate the DOM content within an element, such as reading the value of `<input>`, you can use `querySelector` to get the element you want, in order to get the type support of TypeScript, GemElement provides a way to complete this work:

```ts
// Omit import...

@customElement('my-element')
class MyElement extends GemElement {
  @refobject inputRef: RefObject<HTMLInputElement>;

  render() {
    return html`<input ref=${this.inputRef.ref} />`;
  }

  focus() {
    this.inputRef.element.focus();
  }
}
```

## Custom event

Custom event is a method of transferring data. It can be easily done by using `dispatch(new CustomEvent('event'))`. Also in order to obtain TypeScript type support, GemElement allows you to quickly define methods to emit custom events:

```ts
// Omit import...

@customElement('my-element')
class MyElement extends GemElement {
  @emitter valueChange: Emitter<string>;

  render() {
    return html`<input @change=${(e) => this.valueChange(e.target.value)} />`;
  }
}
```

Add custom event handler:

```ts
html`<my-element @value-change=${console.log}></my-element>`;
```

## Effect

In many cases, elements need to perform some side effects based on certain attributes, such as network requests, and finally update the document. This is where `GemElement.effect` comes in handy. It can check dependencies every time the element is `updated` and execute a callback if the dependencies change.

```ts
// Omit import...

@customElement('my-element')
class MyElement extends GemElement {
  @attribute src: string;

  mounted() {
    this.effect(
      () => fetch(this.src),
      () => [this.src],
    );
  }
}
```

Below is an example of `effect` that depends on child elements([Other implementations](https://twitter.com/youyuxi/status/1327328144525848577?s=20))

<gbp-raw src="https://raw.githubusercontent.com/mantou132/gem/master/packages/gem-examples/src/effect/index.ts"></gbp-raw>

## Memo

In order to avoid performing some complex calculations when re-render, `memo` can execution of the callback when specified dependencies change, unlike the`effect`, `memo` execution before the `render`,
so you should register in the `constructor` or `willMount`:

```ts
// Omit import...

@customElement('my-element')
class MyElement extends GemElement {
  @attribute src: string;

  #href: string;

  willMount() {
    this.memo(
      () => (this.#href = new URL(this.src, location.origin).href),
      () => [this.src],
    );
  }
}
```
