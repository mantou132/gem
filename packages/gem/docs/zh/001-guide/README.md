# 简介

Gem 是一套使用现代 WebComponents 技术构建 WebApp 的轻量级库。
本质上说，你只是创建许多自定义元素，然后让他们协同工作，他们非常灵活，可以很容易的进行扩展，比如集成手势。
除了构建 WebApp，也可以利用 Gem 发布能独立工作的自定义元素（例如 [GemPanel](https://panel.gemjs.org/)），
自定义元素很容易在其他库中使用。
所以，Gem 也特别适用于构建 UI 组件库（例如 [DuoyunUI](https://duoyun-ui.gemjs.org)）。

在学习 Gem 之前，
希望你对 [WebComponents](https://developer.mozilla.org/en-US/docs/Web/Web_Components) 技术有一定的了解。

## 安装

使用 NPM：

```bash
npm install @mantou/gem
```

或者使用 ESM：

```js
import * as Gem from 'https://jspm.dev/@mantou/gem';
```

或者使用 UNPKG：

```html
<script src="https://unpkg.com/@mantou/gem/dist/gem.umd.js"></script>
```

## 开始

<gbp-sandpack dependencies="@mantou/gem">

```js index.js
import { GemElement, html } from '@mantou/gem';

class MyElement extends GemElement {
  render() {
    return html`hello world`;
  }
}

customElements.define('my-element', MyElement);
```

```html index.html
<my-element></my-element>
```

</gbp-sandpack>

使用标准的 [customElements](https://developer.mozilla.org/en-US/docs/Web/API/Window/customElements) 定义一个自定义元素，
然后以任何方式在 HTML 中使用他，当然也可以在其他自定义元素的模板中使用。

在 `render` 方法中返回渲染模版。 Gem 将 [lit-html](https://github.com/Polymer/lit-html) 作为其模版引擎，
他使用 ES6 的模版字符串来编写 HTML 模版，没有其他概念，不存在编译时。

使用变量：

```js
html`<div>${value}</div>`;
```

绑定 attribute 和 property：

```js
html`<div title=${title} .data=${data}></div>`;
```

使用绑定事件

```js
html`<div @click=${clickHandle}></div>`;
```

更详细的语法可以查看 [lit-html](https://lit-html.polymer-project.org/guide) 文档。

## 准备好了吗？

刚才只是介绍了 Gem 最基本的功能 —— 定义 Gem 元素，接下来将介绍开发一个反应性 WebApp 的其他部分。
