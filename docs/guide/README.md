# 简介

gem 是一套使用现代 WebComponents 技术构建 WebApp 的轻量级框架。
本质上说，你只是构建一个个自定义元素，然后让他们协同工作，他们非常灵活，你可以很容易的扩展需要的功能。
另外，这样的 App 很容易和其他框架集成。

在学习 gem 之前，
希望你对 [WebComponents](https://developer.mozilla.org/en-US/docs/Web/Web_Components) 有一定的了解。

## 开始

```html
<hello-world></hello-world>
```

```js
import { GemElement, html } from '@mantou/gem';

class HelloWorld extends GemElement {
  render() {
    return html`
      hello world
    `;
  }
}

customElements.define('hello-world', HelloWorld);
```

[![Edit hello-world](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/hello-world-llky3?fontsize=14&hidenavigation=1&theme=dark)

使用标准的 [customElements](https://developer.mozilla.org/en-US/docs/Web/API/Window/customElements) 定义一个自定义元素，
然后以任何方式在 html 中使用他，当然也可以在其他自定义元素的模板中使用。

在 `render` 方法中渲染模块。 gem 将 [lit-html](https://github.com/Polymer/lit-html) 作为其模版引擎，
他使用 ES6 的模版字符串来编写 html 模版，没有其他概念，也不需要编译。

使用变量：

```js
html`
  <div>${value}</div>
`;
```

绑定 attribute 和 property：

```js
html`
  <div title=${title} .data=${data}></div>
`;
```

使用绑定事件

```js
html`
  <div @click=${clickHandle}></div>
`;
```

更详细的语法可以查看 [lit-html](https://lit-html.polymer-project.org/guide) 文档。

## 准备好了吗？

刚才只是介绍了 gem 最基本的功能——定义 gem 元素，接下来将介绍完成一个反应性 WebApp 的其他部分。
