# Effect

In many cases, elements need to perform some side effects based on certain attributes, such as network requests, and finally update the document. This is where `GemElement.effect` comes in handy. It can check dependencies every time the element is `updated` and execute a callback if the dependencies change.

```ts
// Omit import...

@customElement('hello-world')
class HelloWorld extends GemElement {
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
