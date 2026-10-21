# Gem vs Lit: Same Template Engine, Two Designs

People often ask: what is the difference between Gem and Lit? It is a natural question, because Gem's template engine is [lit-html](https://lit.dev/docs/templates/overview/), both produce standard custom elements, and both use decorators to define elements.

But the difference is not in rendering, it is in how each answers the question "what should a custom element look like". This article compares them design decision by design decision, with code from both sides for each one.

> [!NOTE]
> The Lit code in this article is based on Lit 3 and uses TypeScript decorators.

## Elements are part of the DOM, not components mounted on it

In Lit, the Property is the source of truth, the Attribute is just one way to set it, and it is only written back to the DOM with `reflect: true`:

```ts
@customElement('my-button')
class MyButton extends LitElement {
  @property({ reflect: true }) variant = 'primary';
  @property({ type: Number }) count = 0;
  @property({ type: Boolean }) disabled = false;
}
```

In Gem, Attribute fields read and write the DOM Attribute directly, the DOM itself is the source of truth, and each type has its own decorator:

```ts
@customElement('my-button')
class MyButtonElement extends GemElement {
  @attribute variant: string;
  @numattribute count: number;
  @boolattribute disabled: boolean;

  get #variant() {
    return this.variant || 'primary';
  }
}
```

This leads to two conventions:

- **Attributes have no initial values**. Assigning a value means calling `setAttribute`, so serializing the element (e.g. `outerHTML`, SSR) would output Attributes the user never wrote. Default values are provided by getters, just like `<input>` behaves as `text` when it has no `type`
- **Elements do not modify their own Attributes/Properties**. They are the user's input, changes inside the element are expressed with internal state and reported through events, see [Create controlled element](./002-create-controlled-element.md)

```ts
@customElement('my-counter')
class MyCounterElement extends GemElement {
  @numattribute initial: number;
  @emitter change: Emitter<number>;

  #state = createState({ count: 0 });

  #onClick = () => {
    const count = this.#state.count + 1;
    this.#state({ count });
    this.change(count);
  };
}
```

The Lit equivalent defines an internal reactive field with `@state()`:

```ts
@customElement('my-counter')
class MyCounter extends LitElement {
  @property({ type: Number }) initial = 0;
  @state() private count = 0;

  private onClick() {
    this.count++;
    this.dispatchEvent(new CustomEvent('change', { detail: this.count }));
  }
}
```

> [!WARNING]
> Both have `@state`, but they mean completely different things: Lit's `@state()` is an internal reactive field, while Gem's `@state` is a [CSS custom state](https://developer.mozilla.org/en-US/docs/Web/API/CustomStateSet), see below.

## Declare behavior with decorators instead of lifecycle callbacks

Lit organizes logic in lifecycle methods and uses `changedProperties` to find out which properties changed:

```ts
class MyImage extends LitElement {
  @property() src = '';

  private url = '';

  willUpdate(changed: PropertyValues<this>) {
    if (changed.has('src')) this.url = new URL(this.src, location.href).href;
  }

  updated(changed: PropertyValues<this>) {
    if (changed.has('src')) this.preload();
  }
}
```

The more logic an element has, the more `if`s pile up in lifecycle methods, mixing unrelated logic together. Reusing logic requires extracting it into a [ReactiveController](https://lit.dev/docs/composition/controllers/).

Gem has deprecated lifecycle methods. Instead, dependencies are declared on fields, and each piece of logic stands on its own:

```ts
class MyImageElement extends GemElement {
  @attribute src: string;

  #url = '';

  @memo((i) => [i.src])
  #updateUrl = () => {
    this.#url = new URL(this.src, location.href).href;
  };

  @effect((i) => [i.src])
  #preload = () => {
    // ...
    return () => {
      // Clean up when dependencies change or the element is unmounted
    };
  };
}
```

`@memo` runs before rendering and `@effect` runs after rendering. The dependency array works the same as in React Hooks, but they are just class fields, so there are no stale closures. `@mounted`, `@unmounted` and `@willMount` are only aliases built on them.

Rendering itself is also described with decorators: `@template` accepts a condition, and when there are several, the last one whose condition is met is used; `@fallback` provides content when rendering fails, which Lit does not have built in:

```ts
class MyPageElement extends GemElement {
  @property data?: Data;

  @template()
  #content = () => html`${this.data!.title}`;

  @template((i) => !i.data)
  #loading = () => html`Loading...`;

  @fallback()
  #error = (err: unknown) => html`Error: ${err}`;
}
```

Using private fields has another benefit: the public members of the element are only its Attributes, Properties and methods, as clean as a native element.

## Platform features are all declarative

Custom events, CSS custom states, ARIA, `part` and `slot` are all part of a custom element's public API. In Lit, they are scattered throughout the code:

```ts
@customElement('my-switch')
class MySwitch extends LitElement {
  private internals = this.attachInternals();

  constructor() {
    super();
    this.internals.role = 'switch';
  }

  private toggle(checked: boolean) {
    checked ? this.internals.states.add('checked') : this.internals.states.delete('checked');
    this.dispatchEvent(new CustomEvent('checked-change', { detail: checked, bubbles: true, composed: true }));
  }

  render() {
    return html`<span part="thumb"></span><slot name="label"></slot>`;
  }
}
```

In Gem, each one is a declaration:

```ts
@customElement('my-switch')
@aria({ role: 'switch' })
class MySwitchElement extends GemElement {
  static @part thumb: string;
  static @slot label: string;

  @globalemitter checkedChange: Emitter<boolean>;
  @state checked: boolean;

  #toggle = (checked: boolean) => {
    this.checked = checked;
    this.checkedChange(checked);
  };

  @template()
  #content = () => html`
    <span part=${MySwitchElement.thumb}></span>
    <slot name=${MySwitchElement.label}></slot>
  `;
}
```

Being declarative is about more than writing less code. The decorators themselves describe the element's API: at runtime they are recorded in static fields of the element class (`observedAttributes`, `definedEvents`, `definedCSSStates`, `definedParts`, `definedSlots`) for Devtools and HMR; in static analysis, [gem-analyzer](https://github.com/mantou132/gem/tree/main/packages/gem-analyzer) recognizes the decorators directly to generate documentation. Users can also reference the part name with `MySwitchElement.thumb` instead of a handwritten string.

To get the same information in Lit, you need the [Custom Elements Manifest](https://custom-elements-manifest.open-wc.org/) analyzer and handwritten `@fires`, `@csspart` and `@slot` JSDoc tags, which nothing keeps in sync with the actual code.

## Light DOM by default, with scoped styles

Lit uses Shadow DOM by default, and `static styles` depends on Shadow DOM. If you override `createRenderRoot` to use Light DOM, `static styles` no longer applies and only global CSS is left.

Gem uses Light DOM by default because it performs better than Shadow DOM, and the difference grows with the number of element instances. Light DOM also makes CSS-based tools such as Tailwind CSS easy to use: utility classes can style element content directly without extra work to cross Shadow DOM boundaries. Style sheets can still be adopted and stay scoped:

```ts
const style = css`
  :scope {
    display: block;
  }
  span {
    color: red;
  }
`;

@customElement('my-label')
@adoptedStyle(style)
class MyLabelElement extends GemElement {}
```

The style sheet of a Light DOM element is wrapped in [`@scope`](https://developer.mozilla.org/en-US/docs/Web/CSS/@scope) and adopted by the render root the element is in, and elements of the same kind share one style sheet. The lower bound of the scope is nested child elements, so the `span` rule does not leak into child elements; if you want child content to be stylable from outside, use `@light({ penetrable: true })`.

When you need Shadow DOM, use `@shadow()`. Style sheets are adopted the same way, you just use `:host` instead of `:scope` to select the element itself.

## Change the template syntax instead of piling up directives

Lit keeps the lit-html syntax pure and does all extensions through directives:

```ts
import { ref, createRef } from 'lit/directives/ref.js';
import { when } from 'lit/directives/when.js';

html`
  <input ${ref(this.inputRef)} />
  ${when(this.loading, () => html`<my-spinner></my-spinner>`, () => html`<my-list .items=${items}></my-list>`)}
`;
```

Gem modifies the template engine directly and turns the most common patterns into syntax:

```ts
html`
  <input ${this.#inputRef} />
  <my-spinner v-if=${this.loading}></my-spinner>
  <my-list v-else ${listProps}></my-list>
`;
```

- `${ref}`: pass an object created by `createRef()` directly in element position
- `v-if` / `v-else-if` / `v-else`: conditional rendering like Vue
- `${props}`: pass an object in element position to assign Properties in bulk, Lit needs a third-party spread directive

Gem also uses `null` / `undefined` instead of Lit's `nothing`, and has no `noChange`. The cost is that Gem's template engine is a modified version, so template tooling written for Lit cannot be used directly, but Gem keeps the directive mechanism, and you can write custom directives with `directive`.

## State and scheduling

**Cross-element state**: Lit has no built-in solution, you usually use [@lit/context](https://lit.dev/docs/data/context/) to pass data down the DOM tree, or use Signals. Gem has a built-in global Store:

```ts
const store = createStore({ user: '' });

@customElement('my-avatar')
@connectStore(store)
class MyAvatarElement extends GemElement {
  @template()
  #content = () => html`${store.user}`;
}

store({ user: 'Gem' });
```

A Store is just a plain object plus an update function, with no Provider and no subscription API. In SSR, Stores are isolated per request, and server values can be synced to the client.

**Theme**: Gem has a built-in `createTheme`, whose values are CSS variables that can be used directly in `css`; themes created with `createDecoratorTheme` can also update when element properties change, e.g. switching a set of colors when `variant` changes. In Lit you organize this yourself with CSS variables.

**Render scheduling**: Both batch updates in microtasks. The difference is that Gem's `@async()` elements go into a global render queue that yields the main thread after about 50ms per frame, suitable for rendering many instances at once (e.g. each item of a long list). Lit lets you customize scheduling by overriding `scheduleUpdate`, but has no built-in global queue.

## Positioning: from the smallest element to a complete app

Lit is a library for writing components. It is only responsible for "defining elements and rendering them efficiently", and leaves state management, routing and context to the ecosystem.

Gem is layered, so you can write a component library in the most basic way, and also write apps with a complete solution:

- **`@mantou/gem/lib/reactive` + `@mantou/gem/lib/decorators`**: reactive elements and decorators without the lit-html template engine, which greatly reduces the build size when your components are simple enough
- **`@mantou/gem/lib/element`**: adds the modified lit-html, which is the `GemElement` introduced in this article
- **`@mantou/gem`**: adds routing (`history`), Store and other capabilities needed to write apps
- **Ecosystem**: [gem-ssr](https://github.com/mantou132/gem/tree/main/packages/gem-ssr) and [gemkit](https://github.com/mantou132/gem/tree/main/packages/gemkit) provide server-side rendering and an app framework, and [DuoyunUI](https://github.com/mantou132/gem/tree/main/packages/duoyun-ui) provides a component library

Each layer only adds capabilities on top of the previous one, and a component library only imports the layer it needs. Both produce standard custom elements, so elements written with Lit can be used directly in Gem apps, and vice versa.

## Habits to change when migrating from Lit

If you are familiar with Lit, templates can be reused as is. The main habits to change are:

| Lit                                            | Gem                                                      |
| ---------------------------------------------- | -------------------------------------------------------- |
| `@property({ type: Number }) count = 0`        | `@numattribute count: number`, default value in a getter |
| `@state() private count`                       | `#state = createState({ count: 0 })`                     |
| Modifying its own Property inside the element  | Modify internal state, then notify with `@emitter`       |
| `willUpdate` / `updated` + `changedProperties` | `@memo` / `@effect` + dependency array                   |
| `connectedCallback` / `disconnectedCallback`   | `@mounted` / `@unmounted`                                |
| `render()` method                              | `@template()` fields, can have several                   |
| `static styles` + Shadow DOM                   | `@adoptedStyle(style)`, Light DOM by default, `:scope`   |
| `this.dispatchEvent(new CustomEvent(...))`     | `@emitter` / `@globalemitter`                            |
| `attachInternals()` + `states` / `role`        | `@state` / `@aria`                                       |
| `ref()` / `when()` directives                  | `${ref}` / `v-if`                                        |
| `nothing`                                      | `null` / `undefined`                                     |
| `@lit/context`                                 | `createStore` + `@connectStore`                          |
