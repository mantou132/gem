# DuoyunVisibleBaseElement

`DuoyunVisibleBaseElement` has `hidden` and `visible` event, which fire when the element enters or leaves the viewport,
and it also has `visibility` CSS state.

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
