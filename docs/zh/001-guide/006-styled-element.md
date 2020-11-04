# 样式化元素

由于使用 ShadowDOM，所以不再需要 [CSS Modules](https://css-tricks.com/css-modules-part-3-react/) 类似的方案，
另外浏览器的兼容性近年来已经好转，供应商私有前缀也纷纷被取消，
我们可以使用原生 CSS 功能来完成日常工作。

_[嵌套 CSS](https://drafts.csswg.org/css-nesting-1/) 仍然是非常值得期待的功能。_

## 共享样式

由于样式不能穿透 ShadowDOM，所以不能使用全局样式表来实现共享样式。
但是可以使用 [`<link>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link) 和
[CSS variables](https://developer.mozilla.org/en-US/docs/Web/CSS/--*) 来达到同样的效果，
使用 [Constructable Stylesheet](https://wicg.github.io/construct-stylesheets/) 更加方便，
但目前 Safari 还不支持。

```js
import { GemElement } from '@mantou/gem';
import { createCSSSheet, css } from '@mantou/gem';

// 使用 Constructable Stylesheet 创建样式表
const styles = createCSSSheet(css`
  h1 {
    text-decoration: underline;
  }
`);
class HelloWorld extends GemElement {
  static adoptedStyleSheets = [styles];
}
```

像连接 `Store` 一样，也有一个类似的 Typescript 装饰器可用：`@adoptedStyle`。

```ts
import { GemElement } from '@mantou/gem';
import { adoptedStyle } from '@mantou/gem';

// 省略 styles 定义...

@adoptedStyle(styles)
class HelloWorld extends GemElement {}
```

## CSS in JS

可以在 JS 中引用 CSS 选择器：

```js
import { GemElement, html } from '@mantou/gem';
import { createCSSSheet, styled } from '@mantou/gem';

const styles = createCSSSheet({
  // 这里暂时设计成 `styled.class` 时为了兼容 `styled-component` 的语法高亮
  h1: styled.class`
    text-decoration: underline;
    &:hover {
      text-decoration: none;
    }
  `,
});

class HelloWorld extends GemElement {
  static adoptedStyleSheets = [styles];
  render() {
    return html`<div class=${styles.h1}></div>`;
  }
}
```

## 在元素外自定义样式

可以使用 [`::part`](https://drafts.csswg.org/css-shadow-parts-1/#part) 导出元素内部内容，允许外部进行自定义样式：

```ts
/**
 * 下面的代码跟 `<div part="header"></div>` 效果一样，
 * 但是 Gem 推荐使用装饰器来定义 part，这样在将来能很好的进行 IDE 集成
 */

// 省略导入...

class HelloWorld extends GemElement {
  @part header: string;

  render() {
    return html`<div part=${this.header}></div>`;
  }
}
```

还可以使用 [`:state`](https://github.com/w3c/webcomponents/blob/gh-pages/proposals/custom-states-and-state-pseudo-class.md) 导出元素内部状态，供外部样式化当前状态:

```ts
// 省略导入...

class HelloWorld extends GemElement {
  @state opened: boolean;

  open() {
    // 可被选择器 `:state(opened)` 选中
    this.opened = true;
  }
}
```

_注意跟 `state`/`setState` 的区别。_

## 自定义元素外部样式

- [`::slotted()`](https://developer.mozilla.org/en-US/docs/Web/CSS/::slotted)
