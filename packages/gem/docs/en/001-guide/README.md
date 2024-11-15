# Introduction

Gem is a lightweight library that uses modern [WebComponents](https://developer.mozilla.org/en-US/docs/Web/Web_Components) technology to build WebApp. Essentially, you just create individual custom elements and let them work together. They are very flexible and can be easily extended, such as integrated gestures. In addition to building WebApps, you can also use Gem to publish custom elements that can work independently(e.g [GemPanel](https://panel.gemjs.org/)). Custom elements can be easily used in other libraries, Therefore, Gem is also particularly suitable for building a UI component library(e.g [DuoyunUI](https://duoyun-ui.gemjs.org)).

## Installation

<gbp-code-group>

```bash npm
npm install @mantou/gem
```

```js esm.sh
import * as Gem from 'https://esm.sh/@mantou/gem';
```

```html unpkg.com
<script src="https://unpkg.com/@mantou/gem/dist/gem.umd.js"></script>
```

</gbp-code-group>

## Start

<gbp-sandpack dependencies="@mantou/gem">

```js index.js
@customElement('my-element')
class MyElement extends GemElement {
  render() {
    return html`hello world`;
  }
}
```

```html index.html
<my-element></my-element>
```

</gbp-sandpack>

Decorator `@customElement` use standard [API](https://developer.mozilla.org/en-US/docs/Web/API/Window/customElements) to define a custom element, and then use it in HTML in any way, of course, it can also be used in other custom element templates.

Return the rendering template in the `render` method. Gem uses [lit-html](https://lit.dev/docs/templates/overview/) as its template engine. He uses ES6 template strings to write HTML templates. There are no other concepts and no compile-time.

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

More detailed syntax can be found in [lit-html](https://lit.dev/docs/templates/overview/) document.

## Are you ready?

Just introduced the most basic function of Gem: defining Gem elements, and then I will introduce the other parts of developing a reactive WebApp.
