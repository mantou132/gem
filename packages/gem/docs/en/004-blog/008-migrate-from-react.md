# Migrating from React

React is an excellent UI building library, and its ecosystem has many outstanding tools that Gem draws inspiration from, with the aim of creating a native, compile-free, easy-to-use WebApp development framework.

## Components to Custom Elements

First, let's look at a simple React component. The function name here can be used as a tag name in other components, and the component's properties are marked with `IProps`, which ultimately returns the rendered content of the component:

```tsx
interface IProps {
  name: string;
  data?: Record<string, string>;
}

function MyComponent(props: IProps) {
  const str = JSON.stringify(props.data);

  return (
    <div>
      {props.name}
      <pre>{str}</pre>
    </div>
  );
}
```

In Gem, custom elements are defined using Classes, and elements must be registered with `@customElement`, allowing them to be used in templates. Class fields are used to define element properties, for example, using decorators like `@attribute` to make properties reactive, which gives the fields a similar role to the properties in `IProps` of the above React component. Finally, a `render` method is defined, which ultimately returns the element's content template. This is equivalent to what a React component returns, except that the template uses JavaScript template literals instead of JSX. This is why Gem does not require compilation and can run directly in Vanilla JavaScript.

```ts
@customElement('my-element')
class MyElement extends GemElement {
  @attribute name: string;
  @property data?: Record<string, string>;

  get str() {
    return JSON.stringify(this.data);
  }

  render() {
    return html`
      <div>
        ${this.name}
        <pre>${this.str}</pre>
      </div>
    `;
  }
}
```

When developing components, it's often necessary to maintain internal state and obtain references to child components. In React, this is done using `useState` and `useRef`:

```tsx
function MyComponent() {
  const divRef = useRef<HTMLDivElement>();
  const [count, setCount] = useState(0);

  return (
    <div ref={divRef} onClick={() => setCount(count++)}>
      {count}
    </div>
  );
}
```

In Gem, you use `createState` and `createRef`:

```ts
@customElement('my-element')
class MyElement extends GemElement {
  #divRef = createRef<HTMLDivElement>();
  #state = createState({ count: 0 });

  render() {
    const { count } = this.#state;
    return html`
      <div ${this.#divRef} @click=${() => this.#state({ count: count++ })}>${count}</div>
    `;
  }
}
```

Generally, React components are not that simple; they may have side effects or require memoization for some recalculations. These needs are handled in React using Hooks, for example, memoizing the serialization result from the above React component and logging it after mounting:

```tsx
function MyComponent(props: IProps) {
  userEffect(() => {
    console.log('mounted!');
  }, []);

  const str = React.useMemo(() => {
    return JSON.stringify(props.data);
  }, [props.data]);

  return (
    <div>
      {props.name}
      <pre>{str}</pre>
    </div>
  );
}
```

In Gem, this is accomplished by decorating functions with decorators:

```ts
@customElement('my-element')
class MyElement extends GemElement {
  @attribute name: string;
  @property data?: Record<string, string>;

  @effect(() => [])
  log() {
    console.log('mounted!');
  }

  // Note: can't access `this.data`
  @memo((e) => [e.data])
  get str() {
    return JSON.stringify(this.data);
  }

  render() {
    return html`
      <div>
        ${this.name}
        <pre>${this.str}</pre>
      </div>
    `;
  }
}
```

Overall, custom components written in Gem are more complex than React components, but the benefit is that they can be used in Vanilla JavaScript.

## CSS Modules to Gem

Writing a component cannot avoid styles. In React, to make styles modular, developers usually use [CSS Modules](https://github.com/css-modules/css-modules) or CSS-in-JS solutions like [Styled Components](https://styled-components.com). Here's how to use CSS Modules in a React component:

```css
.title {
  font-size: medium;
}
```

```tsx
import styles from './styles.css';

function MyComponent() {
  return <div className={styles.title}></div>;
}
```

In Gem, you need to manually create an object and apply it to the elements ([should auto adopte?](https://github.com/mantou132/gem/issues/141)):

```ts
const styles = createCSSStyle({
  title: `
    font-size: medium;
  `,
});

@customElement('my-element')
@adoptedStyle(styles)
class MyElement extends GemElement {
  render() {
    return html`<div class=${styles.title}></div>`;
  }
}
```

## Other Tools to Gem

- React Router => `<gem-light-route>`
- React Redux => `Gem.useStore`
- Theming => `@mantou/gem/helper/theme`
- I18n => `@mantou/gem/helper/i18n`
- Request => `@mantou/gem/helper/request`
