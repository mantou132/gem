# 样式化元素

由于使用 ShadowDOM，所以不再需要 [CSS Modules](https://css-tricks.com/css-modules-part-3-react/) 类似的方案，
另外浏览器的兼容性近年来已经好转，供应商私有前缀也纷纷被取消，
可以使用原生 CSS 功能来完成日常工作，例如 [CSS 嵌套](https://drafts.csswg.org/css-nesting-1/)、[`@layer`](https://developer.mozilla.org/en-US/docs/Web/CSS/@layer)。

## 共享样式

由于样式不能穿透 ShadowDOM，所以不能使用全局样式表来实现共享样式。
但是可以使用 [`<link>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link) 和
[CSS variables](https://developer.mozilla.org/en-US/docs/Web/CSS/--*) 来达到同样的效果，
使用 [Constructable Stylesheet](https://wicg.github.io/construct-stylesheets/) 更加方便。

```js 11
import { GemElement } from '@mantou/gem';
import { adoptedStyle, customElement } from '@mantou/gem';

// 使用 Constructable Stylesheet 创建样式表
const styles = createCSSSheet(`
  h1 {
    text-decoration: underline;
  }
`);

@adoptedStyle(styles)
@customElement('my-element')
class MyElement extends GemElement {}
```

## CSS in JS

可以在 JS 中引用 CSS 选择器：

```js 17
import { GemElement, html } from '@mantou/gem';
import { createCSSSheet, styled, adoptedStyle, customElement } from '@mantou/gem';

const styles = createCSSSheet({
  header: styled.class`
    text-decoration: underline;
    &:hover {
      text-decoration: none;
    }
  `,
});

@adoptedStyle(styles)
@customElement('my-element')
class MyElement extends GemElement {
  render() {
    return html`<div class=${styles.header}></div>`;
  }
}
```

## 在元素外自定义样式

可以使用 [`::part`](https://drafts.csswg.org/css-shadow-parts-1/#part) 导出元素内部内容，允许外部进行自定义样式：

```js 13
/**
 * 下面的代码跟 `<div part="header"></div>` 效果一样，
 * 但是 Gem 推荐使用装饰器来定义 part，这样在将来能很好的进行 IDE 集成
 */

// 省略导入...

@customElement('my-element')
class MyElement extends GemElement {
  @part static header;

  render() {
    return html`<div part=${MyElement.header}></div>`;
  }
}
```

还可以使用 [`ElementInternals.states`](https://developer.mozilla.org/en-US/docs/Web/API/ElementInternals/states) 导出元素内部状态，供外部对当前状态的元素样式化:

```js
// 省略导入...

@customElement('my-element')
class MyElement extends GemElement {
  @state opened;

  open() {
    // 可被选择器 `:state(opened)` 选中
    // 考虑兼容性可以使用 `:where(:state(opened), [data-opened])`
    this.opened = true;
  }
}
```

> [!TIP]
> 还可以使用比较 Hack 的方式自定义元素样式，例如：
>
> ```js
> GemLinkElement.adoptedStyleSheets = [
>   createCSSSheet(css`
>     :host {
>       font-style: italic;
>     }
>   `),
> ];
> ```

> [!NOTE]
> 注意跟 `state`/`setState` 的区别

## 自定义元素外部样式

- [`::slotted()`](https://developer.mozilla.org/en-US/docs/Web/CSS/::slotted)
