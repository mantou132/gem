# DuoyunVisibleBaseElement

`DuoyunVisibleBaseElement` 有 `hidden` 和 `visible` 事件，当元素进入或者离开视口时触发，当你的元素需要延时加载时很有用，
它有 `visibility` CSS 状态。

```ts
import { DuoyunVisibleBaseElement } from 'duoyun-ui/elements/base/visible';

@customElement('my-ele')
export class MyEleElement extends DuoyunVisibleBaseElement {
  constructor() {
    super();
    this.addEventListener('visible', this.fetch);
  }
}
```
