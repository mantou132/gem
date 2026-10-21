# Gem 与 Lit：同一个模板引擎，两种设计

经常有人问：Gem 和 Lit 有什么区别？这个问题很自然，因为 Gem 的模板引擎就是 [lit-html](https://lit.dev/docs/templates/overview/)，两者都产出标准的自定义元素，也都使用装饰器来定义元素。

但它们的区别不在渲染，而在于对“一个自定义元素应该是什么样子”的不同回答。本文按设计取舍逐项对比，每一项都附上两边的代码。

> [!NOTE]
> 文中的 Lit 代码基于 Lit 3，使用 TypeScript 装饰器写法。

## 元素是 DOM 的一部分，而不是挂在 DOM 上的组件

在 Lit 中，Property 是数据源，Attribute 只是一种输入方式，需要 `reflect: true` 才会写回 DOM：

```ts
@customElement('my-button')
class MyButton extends LitElement {
  @property({ reflect: true }) variant = 'primary';
  @property({ type: Number }) count = 0;
  @property({ type: Boolean }) disabled = false;
}
```

在 Gem 中，Attribute 字段直接读写 DOM Attribute，DOM 本身就是数据源，并且按类型使用不同的装饰器：

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

这带来了两个约定：

- **Attribute 不赋初始值**。因为赋值就是调用 `setAttribute`，元素序列化（例如 `outerHTML`、SSR）时会多出使用者没有写的 Attribute，默认值用 getter 提供，就像 `<input>` 没有 `type` 时表现为 `text` 一样
- **元素内部不修改自己的 Attribute/Property**。它们是使用者的输入，元素自身的变化用内部状态表达，再通过事件通知外部，参见[创建受控元素](./002-create-controlled-element.md)

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

Lit 中对应的写法是用 `@state()` 定义内部响应式字段：

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
> 两边都有 `@state`，但含义完全不同：Lit 的 `@state()` 是内部响应式字段，Gem 的 `@state` 是 [CSS 自定义状态](https://developer.mozilla.org/en-US/docs/Web/API/CustomStateSet)，见下文。

## 用装饰器声明行为，而不是用生命周期回调

Lit 的逻辑组织在生命周期方法中，通过 `changedProperties` 判断哪些属性发生了变化：

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

一个元素的逻辑越多，生命周期方法中的 `if` 越多，不相关的逻辑混在一起。复用逻辑需要把它抽成 [ReactiveController](https://lit.dev/docs/composition/controllers/)。

Gem 已经弃用了生命周期方法，改为在字段上声明依赖，每段逻辑独立存在：

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
      // 依赖变化或元素卸载时清理
    };
  };
}
```

`@memo` 在渲染前执行，`@effect` 在渲染后执行，依赖数组的语义和 React Hooks 一样，但它们只是类字段，不存在闭包陷阱。`@mounted`、`@unmounted`、`@willMount` 也只是基于它们的别名。

渲染本身也用装饰器描述：`@template` 可以带条件，有多个时使用最后一个满足条件的模板；`@fallback` 提供渲染出错时的内容，这是 Lit 没有内置的：

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

使用私有字段还有一个好处：元素的公开成员只剩下 Attribute、Property 和方法，和原生元素一样干净。

## 平台能力一律声明化

自定义事件、CSS 自定义状态、ARIA、`part`、`slot` 都是自定义元素的公开 API。在 Lit 中，它们分散在代码里：

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

在 Gem 中，每一项都是一个声明：

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

声明化不只是少写几行代码。这些装饰器本身就是元素的 API 描述：运行时它们记录在元素类的静态字段中（`observedAttributes`、`definedEvents`、`definedCSSStates`、`definedParts`、`definedSlots`），供 Devtools 和 HMR 使用；静态分析时 [gem-analyzer](https://github.com/mantou132/gem/tree/main/packages/gem-analyzer) 直接识别装饰器生成文档。外部也能用 `MySwitchElement.thumb` 引用 part 名称，而不是手写字符串。

Lit 要生成同样的信息，需要使用 [Custom Elements Manifest](https://custom-elements-manifest.open-wc.org/) 分析器，并在 JSDoc 中手写 `@fires`、`@csspart`、`@slot`，它们和实际代码之间没有约束。

## 默认 Light DOM，但样式照样隔离

Lit 默认使用 Shadow DOM，`static styles` 也依赖 Shadow DOM。如果覆盖 `createRenderRoot` 改为 Light DOM，`static styles` 就不再生效，只能使用全局 CSS。

Gem 默认使用 Light DOM，因为它的性能比 Shadow DOM 更好，元素实例越多差异越明显。Light DOM 也方便使用 Tailwind CSS 等基于 CSS 的方案：工具类可以直接作用于元素内容，无需额外处理 Shadow DOM 的样式边界。同时，Gem 的样式表仍然可以挂载并保持隔离：

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

Light DOM 元素的样式表会被包裹在 [`@scope`](https://developer.mozilla.org/en-US/docs/Web/CSS/@scope) 中，并挂载到元素所在的渲染根上，同一种元素共享一份样式表。范围的下限是嵌套的子元素，所以 `span` 规则不会泄漏到子元素内部；如果希望子元素内容可以被外部样式化，使用 `@light({ penetrable: true })`。

需要 Shadow DOM 时使用 `@shadow()`，样式表的挂载方式不变，只是选择元素自身时使用 `:host` 而不是 `:scope`。

## 修改模板语法，而不是堆指令

Lit 保持 lit-html 的语法纯粹，扩展都通过指令完成：

```ts
import { ref, createRef } from 'lit/directives/ref.js';
import { when } from 'lit/directives/when.js';

html`
  <input ${ref(this.inputRef)} />
  ${when(this.loading, () => html`<my-spinner></my-spinner>`, () => html`<my-list .items=${items}></my-list>`)}
`;
```

Gem 直接修改了模板引擎，把最常用的写法变成语法：

```ts
html`
  <input ${this.#inputRef} />
  <my-spinner v-if=${this.loading}></my-spinner>
  <my-list v-else ${listProps}></my-list>
`;
```

- `${ref}`：在元素位置直接传入 `createRef()` 创建的对象
- `v-if` / `v-else-if` / `v-else`：类似 Vue 的条件渲染
- `${props}`：在元素位置传入对象，作为 Property 批量赋值，Lit 需要第三方的 spread 指令

另外 Gem 用 `null` / `undefined` 代替了 Lit 的 `nothing`，没有 `noChange`。代价是 Gem 的模板引擎是一个修改版，为 Lit 编写的模板工具链不能直接使用，不过 Gem 保留了指令机制，可以用 `directive` 编写自定义指令。

## 状态和调度

**跨元素状态**：Lit 没有内置方案，通常使用 [@lit/context](https://lit.dev/docs/data/context/) 沿 DOM 树传递，或者使用 Signals。Gem 内置了全局 Store：

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

Store 只是一个普通对象加一个更新函数，没有 Provider，没有订阅 API。在 SSR 中，Store 会按请求隔离，服务端的值也能同步到客户端。

**主题**：Gem 内置了 `createTheme`，主题值是 CSS 变量，可以直接在 `css` 中使用；`createDecoratorTheme` 创建的主题还能根据元素属性变化更新，例如 `variant` 改变时切换一组颜色。在 Lit 中这些需要自己用 CSS 变量组织。

**渲染调度**：两者都在微任务中批量更新。区别是 Gem 的 `@async()` 元素会进入全局渲染队列，每帧最多执行约 50ms 后让出主线程，适合一次渲染大量实例的场景（例如长列表的每一项）。Lit 可以通过覆盖 `scheduleUpdate` 自定义调度，但没有内置的全局队列。

## 定位：从最小的元素到完整的应用

Lit 是编写组件的库，它只负责“定义元素并高效渲染”，状态管理、路由、上下文都交给生态。

Gem 是分层的，既能用最基本的方式编写组件库，又能使用完整方案编写应用：

- **`@mantou/gem/lib/reactive` + `@mantou/gem/lib/decorators`**：反应性元素和装饰器，不包含 lit-html 模板引擎，组件足够简单时可以大幅减少构建尺寸
- **`@mantou/gem/lib/element`**：加上修改版 lit-html，也就是本文介绍的 `GemElement`
- **`@mantou/gem`**：再加上路由（`history`）、Store 等编写应用需要的能力
- **生态**：[gem-ssr](https://github.com/mantou132/gem/tree/main/packages/gem-ssr) 和 [gemkit](https://github.com/mantou132/gem/tree/main/packages/gemkit) 提供服务端渲染和应用框架，[DuoyunUI](https://github.com/mantou132/gem/tree/main/packages/duoyun-ui) 提供组件库

每一层都只在上一层之上增加能力，组件库只引入它需要的那一层。两者的产物都是标准自定义元素，所以 Gem 应用中可以直接使用 Lit 编写的元素，反之亦然。

## 从 Lit 迁移时需要改变的习惯

如果你已经熟悉 Lit，模板部分可以直接沿用，需要改变的主要是下面这些习惯：

| Lit                                            | Gem                                                 |
| ---------------------------------------------- | --------------------------------------------------- |
| `@property({ type: Number }) count = 0`        | `@numattribute count: number`，默认值写在 getter 中 |
| `@state() private count`                       | `#state = createState({ count: 0 })`                |
| 在元素内部修改自己的 Property                  | 修改内部状态，再用 `@emitter` 通知外部              |
| `willUpdate` / `updated` + `changedProperties` | `@memo` / `@effect` + 依赖数组                      |
| `connectedCallback` / `disconnectedCallback`   | `@mounted` / `@unmounted`                           |
| `render()` 方法                                | `@template()` 字段，可以有多个                      |
| `static styles` + Shadow DOM                   | `@adoptedStyle(style)`，默认 Light DOM，`:scope`    |
| `this.dispatchEvent(new CustomEvent(...))`     | `@emitter` / `@globalemitter`                       |
| `attachInternals()` + `states` / `role`        | `@state` / `@aria`                                  |
| `ref()` / `when()` 指令                        | `${ref}` / `v-if`                                   |
| `nothing`                                      | `null` / `undefined`                                |
| `@lit/context`                                 | `createStore` + `@connectStore`                     |
