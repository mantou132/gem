# v2 介绍

经过漫长的开发实践，Gem 终于开始迈入了 v2，Gem 以让用户简单的方式编写自定义元素为宗旨进行了此次迭代。下面将介绍 v2 的一些重大更新。

## 装饰器

v2 使用 ES 装饰器[代替了以前的 TS 装饰器](./es-decorators)，并且将 `GemElement.constructor` 的参数用装饰器代替：

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

使用装饰器具有更好的可扩展性，另外也降低了代码复杂度。基于同样的目的，还添加了 `@effect` `@memo` 等装饰器让你编写更简洁的自定义元素：

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
> 未来 Gem 可能会[弃用生命周期回调函数](https://github.com/mantou132/gem/issues/159)，全面使用装饰器代替

## 内部状态和 DOM 引用

v1 使用特定的字段 `state` 来表示元素内部状态，并使用 `this.setState` 来更新状态，在 v2 中，可以使用任意字段，因为定义状态的同时定义了更新方法：

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

类似 `createState`，用 `createRef` 来代替 v1 的 `@refobject`：

```ts
@customElement('my-element')
class MyElement extends GemElement {
  #input = createRef();

  render = () => {
    return html`<input ${this.#input} />`;
  }
}
```

## 默认使用 Light DOM

Gem 使用 Shadow DOM 的一个理由是样式隔离性，他让用户可以直接编写“模块化”的 CSS，但是使用 Shadow DOM 编写 WebApp 也有一些缺点：

- 不能使用 SVG 符号
- URL Hash 无效
- `document.activeElement` 无效
- 不方便集成 React/Vue 组件
- 性能较差

如果不是写需要高度封装的自定义元素（例如 UI 库），使用 Light DOM 是更合适的选择。现在，CSS 规范带来了 [`@scope`](https://developer.mozilla.org/en-US/docs/Web/CSS/@scope)，所以 Gem 充分利用 `@scope` 并默认使用 Light DOM，并且同样具备“模块化”（v1 不支持 Light DOM 样式“模块化”），下面的例子中，`div` 选择器将只应用在 `<my-element>` 的内容上：

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
> 就像开头的例子，如果想要使用 Shadow DOM，需要添加 `@shadow`，并将 [`:scope`](https://developer.mozilla.org/en-US/docs/Web/CSS/:scope) 替换成 `:host`。

## 主题增强

<gbp-include src="../snippets/scoped-theme.md"></gbp-include>

## 一起创造更好的 Gem

希望 Gem 能以卓越的设计成为创建自定义元素的首选方案，如果你有任何建议和想法，请[创建 Issue](https://github.com/mantou132/gem/issues/new)。
