# 样式化元素

## 共享样式

由于样式不能穿透 ShadowDOM，所以不能使用全局样式表来实现共享样式。
但是可以使用 `<link>` 来达到同样的效果，
使用 [Constructable Stylesheet](https://wicg.github.io/construct-stylesheets/) 更加方便，但是 Safari 还不支持。

```js
import { createCSSSheet, css, GemElement } from '@mantou/gem';

const styles = createCSSSheet(css`
  h1 {
    text-decoration: underline;
  }
`);
class HelloWorld extends GemElement {
  static observedAttributes = [styles];
}
```

像绑定 `Store` 一样，也实现了一个 Typescript 装饰器：

```ts
import { adoptedStyle, GemElement } from '@mantou/gem';

@adoptedStyle(styles)
class HelloWorld extends GemElement {}
```

## CSS in JS

可以在 js 中引用 css 选择器：

```js
import { createCSSSheet, styled, GemElement, html } from '@mantou/gem';

const styles = createCSSSheet({
  h1: styled.class`
    text-decoration: underline;
  `,
});

class HelloWorld extends GemElement {
  static observedAttributes = [styles];
  render() {
    return html`
      <div class=${styles.h1}></div>
    `;
  }
}
```

## 自定义样式

可以使用 [`::part`](https://drafts.csswg.org/css-shadow-parts-1/#part) 导出元素内部内容，允许外部进行自定义样式：

```js
class HelloWorld extends GemElement {
  @part header: string;

  render() {
    return html`
      <div part=${this.header}></div>
    `;
  }
}
```

还可以使用 [`:state`](https://github.com/w3c/webcomponents/blob/gh-pages/proposals/custom-states-and-state-pseudo-class.md) 导出元素内部状态，供外部样式化当前状态:

```js
class HelloWorld extends GemElement {
  @state opened: boolean;

  open() {
    this.opened = true;
  }
}
```
