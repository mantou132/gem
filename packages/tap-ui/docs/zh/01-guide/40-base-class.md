# 基类

基类为自定义元素提供通用功能，继承它们即可获得这些功能。

## TapResizeBaseElement

`TapResizeBaseElement` 在元素尺寸发生变化时触发更新，
它有 `borderBoxSize` 和 `contentRect` 属性，并会触发 `resize` 事件。

```ts
import { TapResizeBaseElement } from '@mantou/tap-ui/elements/base/resize';

@customElement('my-ele')
export class MyEleElement extends TapResizeBaseElement {
  @template()
  #content = () => html`${JSON.stringify(this.contentRect)}`;
}
```

## TapScrollBaseElement

`TapScrollBaseElement` 在可滚动边界渐隐内容，例如 [`<tap-scroll-box>`](../02-elements/scroll-box.md)，
它有 `top-overflow` `right-overflow` `bottom-overflow` `left-overflow` CSS 状态。

## TapVisibleBaseElement

`TapVisibleBaseElement` 在元素进入或离开视口时触发 `show` 和 `hide` 事件，当元素需要延时加载时很有用，
它有 `visible` CSS 状态。`full-show` 事件和 `full-visible` CSS 状态用于元素完全进入视口的情况。

```ts
import { TapVisibleBaseElement } from '@mantou/tap-ui/elements/base/visible';

@customElement('my-ele')
export class MyEleElement extends TapVisibleBaseElement {}

html`<my-ele @show=${fetchData}></my-ele>`;
```
