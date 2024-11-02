# 样式化元素

得益于 ShadowDOM、[CSS 嵌套](https://drafts.csswg.org/css-nesting-1/)、[`@layer`](https://developer.mozilla.org/en-US/docs/Web/CSS/@layer)、[`@scope`](https://developer.mozilla.org/en-US/docs/Web/CSS/@scope)，另外浏览器的兼容性近年来已经好转，供应商私有前缀也纷纷被取消，所以不再需要 [CSS Modules](https://css-tricks.com/css-modules-part-3-react/) 类似的方案。

## 共享样式

使用 `css` 能创建可共享样式表，再使用 `@adoptedStyle` 应用到需要的元素即可。

```js 11
import { GemElement } from '@mantou/gem';
import { adoptedStyle, customElement } from '@mantou/gem';

// 使用 Constructable Stylesheet 创建样式表
const styles = css`
  h1 {
    text-decoration: underline;
  }
`;

@adoptedStyle(styles)
@customElement('my-element')
class MyElement extends GemElement {}
```

由于样式不能穿透 ShadowDOM，所以不能使用全局样式表来实现共享样式。
但是可以使用 [CSS variables](https://developer.mozilla.org/en-US/docs/Web/CSS/--*) 来达到同样的效果。

## CSS in JS

可以在 JS 中引用 CSS 选择器：

```js 17
import { GemElement, html } from '@mantou/gem';
import { css, styled, adoptedStyle, customElement } from '@mantou/gem';

const styles = css({
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

> [!NOTE]
> 使用 `$` 作为键代表 `:host, :scope` 选择器，让样式同时适用于 ShadowDOM 和 LightDOM

## 样式化实例

如果需要通过属性或者状态指定单个实例的样式可以：

```js
// 省略导入...

@customElement('my-element')
class MyElement extends GemElement {
  @attribute color;

  render() {
    return html`
      <style>
        :host {
          --color: ${this.color}
        }
      </style>
    `;
  }
}
```

这个方法写法复杂且麻烦，推荐使用 [`createDecoratorTheme`](../002-advance/003-theme.md#element-level-theme)。

## 在元素外自定义样式

可以使用 [`::part`](https://drafts.csswg.org/css-shadow-parts-1/#part)(仅限于 ShadowDOM) 导出元素内部内容，允许外部进行自定义样式：

```js 14
/**
 * 下面的代码跟 `<div part="header"></div>` 效果一样，
 * 但是 Gem 推荐使用装饰器来定义 part，这样在将来能很好的进行 IDE 集成
 */

// 省略导入...

@customElement('my-element')
@shadow()
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
    this.opened = true;
  }
}
```

> [!NOTE]
> 注意跟 `createState` 的区别

> [!TIP]
> 还可以使用比较 Hack 的方式自定义元素样式，例如：
>
> ```js
> GemLinkElement[Symbol.metadata].adoptedStyleSheets.push(
>   css`
>     * {
>       font-style: italic;
>     }
>   `,
> );
> ```

## 自定义元素外部样式

- [`::slotted()`](https://developer.mozilla.org/en-US/docs/Web/CSS/::slotted)
