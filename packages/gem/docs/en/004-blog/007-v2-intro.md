# v2 Introduction

After a long development process, Gem has finally entered v2, focusing on allowing users to write custom elements in a simple way. Below are some major updates in v2.

## Decorators

v2 uses ES decorators [instead of the previous TS decorators](./006-es-decorators.md) and replaces the parameters of `GemElement.constructor` with decorators:

```diff
@customElement('my-element')
+@aria({ focusable: true, role: 'button' })
+@shadow()
+@async()
class MyElement extends GemElement {
-  constructor() {
-    super({ focusable: true, isAsync: true, isLight: false });
-    this.internals.role = 'button';
-  }
}
```

Using decorators provides better scalability and reduces code complexity. For the same purpose, decorators like `@effect` and `@memo` have been added to help you write more concise custom elements:

```ts
@customElement('my-element')
class MyElement extends GemElement {
  @attribute name: string;

  #content: string;

  @memo((myElement) => [myElement.name])
  #calcContent = () => {
    this.#content = this.name;
  }

  @effect((myElement) => [myElement.name])
  #fetchData = () => {
    // request
  }
}
```

> [!WARNING]
> In the future, Gem may [deprecate lifecycle callback functions](https://github.com/mantou132/gem/issues/159) and fully use decorators instead.

## Internal State and DOM Ref

v1 used a specific field `state` to represent the internal state of the element and used `this.setState` to update the state. In v2, any field can be used, as defining the state also defines the update method:

```ts
@customElement('my-element')
class MyElement extends GemElement {
  #state = createState({ a: true });

  render = () => {
    this.#state({ a: false });
    console.log(this.#state.a);
  }
}
```

Similar to `createState`, use `createRef` to replace v1's `@refobject`:

```ts
@customElement('my-element')
class MyElement extends GemElement {
  #input = createRef();

  render = () => {
    return html`<input ${this.#input} />`;
  }
}
```

## Default Use of Light DOM

One reason Gem uses Shadow DOM is for style isolation, allowing users to write "modular" CSS directly. However, there are some drawbacks to using Shadow DOM for WebApp development:

- Cannot use SVG symbols
- URL Hash is ineffective
- `document.activeElement` is ineffective
- Inconvenient to integrate React/Vue components
- Poorer performance

If you are not writing highly encapsulated custom elements (such as UI libraries), using Light DOM is a more suitable choice. Now, the CSS specification has introduced [`@scope`](https://developer.mozilla.org/en-US/docs/Web/CSS/@scope), so Gem takes full advantage of `@scope` and defaults to using Light DOM, while also supporting "modularity" (v1 does not support Light DOM style "modularity"). In the example below, the `div` selector will only apply to the content of `<my-element>`:

```ts
const styles = css`
  :scope {
    display: block;
  }
  div {
    color: red;
  }
`;

@customElement('my-element')
@adoptedStyle(styles)
class MyElement extends GemElement {}
```

> [!NOTE]
> Just like in the initial example, if you want to use Shadow DOM, you need to add `@shadow` and replace [`:scope`](https://developer.mozilla.org/en-US/docs/Web/CSS/:scope) with `:host`.

## Theme enhancement

<gbp-include src="../snippets/scoped-theme.md"></gbp-include>

## Creating better Gem together

We hope Gem can become the preferred solution for creating custom elements with excellent design. If you have any suggestions or ideas, please [create an issue](https://github.com/mantou132/gem/issues/new).
