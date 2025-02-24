# 从 React 迁移到 Gem

React 是一个非常优秀的 UI 构建库，其生态中也有很多优秀的工具，Gem 在许多地方都有借鉴，目的是打造一个基于原生、无需编译、易于使用的 WebApp 开发框架。

## 从编写组件到编写自定义元素

先来看一个简单的 React 组件，这里的函数名称可以作为标签名在其他组件中使用，该组件的属性使用 `IProps` 标记，最后返回组件的渲染内容：

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

在 Gem 中使用 Classes 定义自定义元素，并且必须使用 `@customElement` 注册元素，这让元素能在模板中使用；使用类字段来定义元素属性，例如 `@attribute` 等装饰器来比较属性为反应性，这让字段具有上面 React 组件中 `IProps` 中属性类似的作用；最后定义一个 `render` 方法，该方法最终返回元素内容模板，它和 React 组件返回的内容相当，只不过模板使用 JavaScript 模板字符串而非 JSX，正是因为这样，Gem 才不需要编译，能直接运行在 Vanilla JavaScript 中。

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

开发组件时，常常需要维护内部状态、获取子组件引用，在 React 中使用 `useState` 和 `useRef` 来完成：

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

在 Gem 中使用 `createState` 和 `createRef`：

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

一般情况下 React 组件没有那么简单，组件很可能有副作用，或者一些重计算需要记忆化，这些需求在 React 中使用 Hooks，例如将上面 React 组件中的序列化结果记忆化，并在挂载后打印日志：

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

在 Gem 中，是通过装饰器装饰函数来完成中：

```ts
@customElement('my-element')
class MyElement extends GemElement {
  @attribute name: string;
  @property data?: Record<string, string>;

  @effect(() => [])
  log() {
    console.log('mounted!');
  }

  // 注意：不能从 `this` 访问 `data`
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

总的来说 Gem 写的自定义组件要比 React 组件复杂，带来的好处是可以在 Vanilla JavaScript 中使用。

## 从 CSS Modules 迁移到 Gem

编写一个组件绕不开样式，在 React 中，为了让样式模块化，通常使用 [CSS Modules](https://github.com/css-modules/css-modules) 或者 CSS in JS 方案如 [Styled Components](https://styled-components.com/)，来看看在 React 组件中使用 CSS Modules：

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

在 Gem 中，需要手动创建对象并应用到元素上（[应该自动应用？](https://github.com/mantou132/gem/issues/141)）：

```ts
const styles = css({
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

## 其他工具迁移到 Gem

- React Router => `<gem-light-route>`
- React Redux => `Gem.createStore`
- Theming => `@mantou/gem/helper/theme`
- I18n => `@mantou/gem/helper/i18n`
- Request => `@mantou/gem/helper/request`
