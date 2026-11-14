# Base classes

Base classes provide common features for custom elements, extend them to get these features.

## TapResizeBaseElement

`TapResizeBaseElement` is updated when the element size changes,
it has `borderBoxSize` and `contentRect` properties and fires the `resize` event.

```ts
import { TapResizeBaseElement } from '@mantou/tap-ui/elements/base/resize';

@customElement('my-ele')
export class MyEleElement extends TapResizeBaseElement {
  @template()
  #content = () => html`${JSON.stringify(this.contentRect)}`;
}
```

## TapScrollBaseElement

`TapScrollBaseElement` fades content at scrollable border, e.g: [`<tap-scroll-box>`](../02-elements/scroll-box.md),
and it has `top-overflow` `right-overflow` `bottom-overflow` `left-overflow` CSS state.

## TapVisibleBaseElement

`TapVisibleBaseElement` fires the `show` and `hide` events when the element enters or leaves the viewport,
and it has the `visible` CSS state. The `full-show` event and `full-visible` CSS state are for the element being entirely within the viewport.

```ts
import { TapVisibleBaseElement } from '@mantou/tap-ui/elements/base/visible';

@customElement('my-ele')
export class MyEleElement extends TapVisibleBaseElement {}

html`<my-ele @show=${fetchData}></my-ele>`;
```
