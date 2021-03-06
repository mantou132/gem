# Introduction

Gem is a lightweight library that uses modern WebComponents technology to build WebApp. Essentially, you just create individual custom elements and let them work together. They are very flexible and can be easily extended, such as integrated gestures. In addition, you can also use Gem to build and publish only custom elements, which can be easily integrated with other library. So, you can use Gem to build UI component library.

Before learning Gem, Hope you have a certain understanding of [WebComponents](https://developer.mozilla.org/en-US/docs/Web/Web_Components) technology.

## Installation

use npm:

```bash
npm install @mantou/gem
```

or use ES modules:

```js
import * as Gem from 'https://dev.jspm.io/@mantou/gem';
```

or use Unpkg：

```html
<script src="https://unpkg.com/@mantou/gem/umd.js"></script>
```

## Start

```html
<my-element></my-element>
```

```js
import { GemElement, html } from '@mantou/gem';

class MyElement extends GemElement {
  render() {
    return html`hello world`;
  }
}

customElements.define('my-element', MyElement);
```

[![Edit `<my-element>`](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/hello-world-llky3?fontsize=14&hidenavigation=1&theme=dark)

Use standard [customElements](https://developer.mozilla.org/en-US/docs/Web/API/Window/customElements) to define a custom element, and then use it in HTML in any way, of course, it can also be used in other custom element templates.

Return the rendering template in the `render` method. Gem uses [lit-html](https://github.com/Polymer/lit-html) as its template engine. He uses ES6 template strings to write HTML templates. There are no other concepts and no compile-time.

Use variables:

```js
html`<div>${value}</div>`;
```

Bind attribute and property:

```js
html`<div title=${title} .data=${data}></div>`;
```

Use event bind:

```js
html`<div @click=${clickHandle}></div>`;
```

More detailed syntax can be found in [lit-html](https://lit-html.polymer-project.org/guide) document.

## Are you ready?

Just introduced the most basic function of Gem: defining Gem elements, and then I will introduce the other parts of developing a reactive WebApp.
