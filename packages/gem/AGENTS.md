# Gem

Rules for writing [Gem](https://gemjs.org) elements. Gem elements extend `GemElement` or its derived classes.

## Gem Syntax Example

```ts
// Create a store for global state
// It may also be imported from another module
const store = createStore({
  globalCount: 1,
  text: '',
});

// A function that updates the store. A store is a data object and also a function that updates it
// Usually defined in the same module as the store; it may be omitted since `store({})` can be called directly
const addCount = () => store({ globalCount: store.globalCount + 1 });

// Create a theme for element instances
// Use it when the element's styles depend on its attributes or properties
// It is a special theme that is also a decorator on the element, updating theme values when the element changes
const elementTheme = createDecoratorTheme({ color: 'red' });

// `css` creates a style sheet that can be adopted by Gem elements, CSS nesting is supported
// `:host` can only be used when the element uses Shadow DOM via `@shadow`
// Otherwise use `:scope`; they behave differently, don't just swap one for the other
// Don't write inline styles in templates; style sheets are shared and separated from the DOM
// If the project defines a theme, read CSS values from it
const style = css`
  :scope {
    display: block;
    color: ${theme.textColor};
  }
`;

// For complex elements, define class names this way and reference them in templates as `style1.content`
const style1 = css({
  // `$` means `:host` or `:scope`
  $: `
    font-size: small;
  `,
  content: `
    font-size: 24px;
    color: ${elementTheme.color};
  `,
});

// Custom element tag name, using the project's namespace, e.g. `dy`
@customElement('dy-test')
// Adopt a style sheet, use it multiple times to adopt multiple style sheets
@adoptedStyle(style)
@adoptedStyle(style1)
// Connect a store, the element updates when the store updates; use it multiple times to connect multiple stores
@connectStore(store)
// Light DOM by default, `@shadow()` makes it Shadow DOM, the argument is `ShadowRootInit`
@shadow()
// Rarely needed, only when the element's content must be styleable from outside
@light({ penetrable: true })
// Render without blocking the main thread, useful when many instances render at once
@async()
// ARIA properties of the element for accessibility
@aria({ role: 'region' })
// Class name: `Duoyun` is the full name of `dy`, followed by `Element`, like native HTML element class names
class DuoyunTestElement extends GemElement {
  // Define a part; as a static field it can be referenced from outside. No initial value needed, the decorator provides one with the same name
  static @part img: string;
  // Define a slot, same as `@part`
  static @slot content: string;
  // An attribute named `src`, an empty string when not set
  @attribute src: string;
  // An attribute named `count` parsed as a number, `0` when not set
  @numattribute count: number;
  // An attribute named `show` parsed as a boolean, `false` when not set
  @boolattribute show: boolean;
  // Use a property for values attributes can't represent. It may not be set, so always handle the empty case; changes re-render the element
  @property data?: {};
  // Defines a `display-content` event, dispatched by calling `this.displayContent(true)`
  // Only the type is needed, its parameter is the `detail` of the custom event
  // Use `null` when there is no data to pass
  // `@globalemitter` events bubble across Shadow DOM boundaries
  @emitter displayContent: Emitter<boolean>;
  // A CSS custom state, only for outside CSS selectors such as `dy-test:state(open)`
  // Update it with `this.open = true`, no special restrictions
  @state open: boolean;

  // A `{ value?: HTMLImageElement }` object to access the DOM
  #imgRef = createRef<HTMLImageElement>();
  // Internal state, update it with `this.#state({ ... })`
  // Like native elements, an element should not update its own attributes/properties
  // Unrelated to the CSS state `@state`
  #state = createState({ internalCount: 1 });

  // Don't give attributes initial values, they would appear in the serialized DOM; use a getter for defaults
  // Properties can have initial values, or also use a getter
  get #src() {
    return this.src || 'test';
  }
  
  // Use `@memo` for expensive computations, its argument receives the instance and returns a dependency array
  // Runs before each render, the body only runs when dependencies change
  // `@willMount` is built on `@memo`
  @memo((i) => [i.src])
  get #text() {
    return this.src.repeat(10);
  }

  // Side effect after each render, same argument as `@memo`, runs every time without one
  // The returned function is the cleanup, called before the next run
  // Similar to React's `useLayoutEffect`
  // `@mounted` and `@unmounted` are built on `@effect`
  @effect()
  #print = () => {
    console.log('updated');
    return () => console.log('clear');
  }

  // `@template` marks the render function, its optional argument is a condition to render different content
  // Without a condition it always applies
  @template()
  #content = () => {
    const imgProps = { dataTest: 1 };
    // Template syntax is lit-html plus Vue-like `v-if`, refs and spread attributes
    // Use `classMap` `styleMap` `partMap` `exportPartsMap` when needed
    return html`
      <img ${this.#imgRef} ${imgProps} src=${this.#src} part=${DuoyunTestElement.part} />
      <div class=${classMap({ div: true })} v-if=${this.show}>Show</div>
      <div v-else class=${style1.content} style=${styleMap({ fontSize: '10px' })}>None</div>
    `;
  }

  // After each update, recompute the theme when dependencies change; without dependencies it updates every time
  @elementTheme((i) => [i.show])
  #updateTheme = () => ({ color: this.show ? 'red' : 'blue' });

  // Fallback content when rendering fails, only needed when rendering can fail
  @fallback()
  #errorContent = (err) => {
    return html`Error: ${err}`;
  }

  // Gem elements use ES decorators, which fully describe the element, no extra custom element declarations needed
  // Don't use lifecycle methods, they are deprecated! Decorate plain functions instead
  // Prefer ES private fields (`#aaa`) over class methods to avoid `this` binding issues
}

```

## Gem Best Practices

- [Create standard and reliable custom elements](https://github.com/mantou132/gem/blob/main/packages/gem/docs/en/004-blog/001-create-standard-element.md)
