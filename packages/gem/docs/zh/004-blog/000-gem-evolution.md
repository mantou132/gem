# Gem 的演进

随着 [WebComponents](https://developer.mozilla.org/en-US/docs/Web/Web_Components) 被各个浏览器正式支持，Gem 便开始萌芽，从最早的单文件到现在开发 WebApp 的完整解决方案。

## 实现思路

受 React 的影响，声明式编写 UI 组件已经深入人心。使用 ES6 的模版字符串，可以获得和 JSX 类似的开发体验，利用 [`innerHTML`](https://developer.mozilla.org/en-US/docs/Web/API/Element/innerHTML) 可以将模版解析成 DOM，遍历解析后的 DOM 可以将 ES6 模版字符串中的变量和 Node 进行绑定，从而实现更新组件的目的，为此，Gem 使用 [lit-html](https://github.com/Polymer/lit-html) 作为模版引擎。

```js
render(html`<div>${name}</div>`, document.body);
```

CSS 的作用域是全局的，为了获得独立的组件式开发体验，常常会使用 CSS modules 或者 CSS in JS 等方案，Gem 利用自定义元素的 [ShadowDOM](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_shadow_DOM) 来达成此目的，你可以在 ShadowDOM 中直接编写 `<style>` 而无需考虑 CSS 冲突等问题。

[自定义元素](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements)的 `observedAttributes` 和 `attributeChangedCallback` 可以实现在属性更新时执行回调更新元素，ES6 模版字符串[标签函数](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#Tagged_templates)的不变数组参数也让重复调用渲染函数只更新变化的部分成为可能。

```js
class Component extends HTMLElement {
  constructor() {
    super();
    this._shadowRoot = this.attachShadow({ mode: 'open' });
  }

  render() {
    return html``;
  }

  connectedCallback() {
    render(this.render(), this._shadowRoot);
  }

  attributeChangedCallback() {
    render(this.render(), this._shadowRoot);
  }
}

class MyElement extends Component {
  static get observedAttributes() {
    return ['name'];
  }

  render() {
    return html`<div>${this.getAttribute('name')}</div>`;
  }
}

customElements.define('my-element', MyElement);
```

另外定义 `observedProperties` 静态字段声明受“观察”的 Properties，并在构造函数中将他们定义成 `getter`/`setter`，使他们在更新时能像 `attributeChangedCallback` 一样有机会执行回调重新渲染内容。

除了 `observedProperties` 还定义 `observedStores` 静态字段，它声明受观察的一些特殊对象(Store)，在构造函数中将元素实例的更新方法和 Store 绑定，在更新 Store 执行绑定的更新方法重新渲染元素内容。Store 即可用来组件间共享数据，进行集中式全局数据管理。

## JS 实现

基于上述思路，可以编写一个[完整](https://github.com/mantou132/mt-music-player/blob/master/fe/lib/component.js)的 `Component` 基类，基于原生[生命周期](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements#Using_the_lifecycle_callbacks)定义了下列生命周期：

- willMount
- render
- mounted
- shouldUpdate
- updated
- unmounted
- attributeChanged

他们能在元素挂载、更新、挂载等不同的时期执行用户定义的回调，而原生生命周期回调用来执行一些 `Component` 内部的工作。

`Component` 还定义了一个 `setState` 方法，它模拟 React 的 `setState`，实际上只是在 `Object.assign` 更新元素的 `state` 属性后调用了内部的更新方法。

另外，`Component` 将 Attribute 同步成了 Property，使用 `this.name` 即可读取 `name` Attribute。

## TS 支持

在大型前端项目中，使用 TypeScript 是非常合适的选择，此时，`Component` 使用 TypeScript 是比较麻烦的，可“观察”声明和类型声明是重复的：

```ts
class MyElement extends Component {
  static get observedAttributes() {
    return ['name'];
  }

  static get observedProperties() {
    return ['data'];
  }

  name: string;
  data: { result: string[] } | undefined;

  render() {
    return html`<div>${this.name}</div>`;
  }
}

customElements.define('my-element', MyElement);
```

为此，Gem 定义了一系列装饰器，他们以很简单的方式声明元素的可“观察”属性：

```ts
@customElement('my-element')
class MyElement extends GemElement {
  @attribute name: string;
  @property data: { result: string[] } | undefined;

  render() {
    return html`<div>${this.name}</div>`;
  }
}
```

另外，`Component` 也改名成 `GemElement`。

## 抛弃 `attributeChanged`

在元素需要基于某个属性执行一些副作用（如获取远端数据）时，需要使用 `attributeChanged`，它类似 `attributeChangedCallback`，可以在属性更新时执行回调，在回调中判断更新的属性执行相应的动作：

```ts 6-8
@customElement('my-element')
class MyElement extends GemElement {
  // ...

  attributeChanged(name) {
    if (name === 'name') {
      // 做一些事情
    }
  }
}
```

这种方式存在的最大问题是硬编码，为了避免硬编码，`GemElement` 实现了 `effect` 方法，它在元素每次更新后都检查指定的依赖(可以是任意值)，如果依赖更新则执行回调：

```ts 6-11
@customElement('my-element')
class MyElement extends GemElement {
  // ...

  mounted() {
    this.effect(
      () => {
        // 做一些事情
      },
      () => [this.name],
    );
  }
}
```

## 实现 Web 开发中常见的其他需求

- [内置自定义元素](../003-api/005-built-in-element.md)：Gem 内置 `<gem-route>`、`<gem-link>`、`<gem-title>`、`<gem-use>`、`<gem-unsafe>` 和 `<gem-reflect>`
- 国际化支持
- 主题支持
- [DevTools](https://github.com/mantou132/gem-devtools/)

## 正在进行中的工作

分析 `GemElement`，生成 jsdoc 描述或者自定义元素数据，以支持自动文档生成和 IDE 集成优化。
