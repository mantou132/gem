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

  mounted() {
    console.log(this.inputRef.element.value);
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

<gbp-raw src="/src/examples/effect/index.ts"></gbp-raw>
