# DuoyunResizeBaseElement

`DuoyunResizeBaseElement` is updated when the element size changes, e.g: [`<dy-area-chart>`](./area-chart.md),
and it has `borderBoxSize` and `contentRect` property

```ts
import { DuoyunResizeBaseElement } from 'duoyun-ui/elements/base/resize';

@customElement('my-ele')
export class MyEleElement extends DuoyunResizeBaseElement {
  render = () => {
    return html`${JSON.stringify(this.contentRect)}`;
  };
}
```
