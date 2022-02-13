# DuoyunResizeBaseElement

`DuoyunResizeBaseElement` 元素当尺寸发生变化时，触发更新，例如 [`<dy-area-chart>`](./area-chart.md),
它还有 `borderBoxSize` `contentRect` 属性读取元素尺寸信息。

```ts
import { DuoyunResizeBaseElement } from 'duoyun-ui/elements/base/resize';

@customElement('my-ele')
export class MyEleElement extends DuoyunResizeBaseElement {
  render = () => {
    return html`${JSON.stringify(this.contentRect)}`;
  };
}
```
