import { GemElement } from '@mantou/gem';
@customElement('my-element')
export class MyElement extends GemElement {
  *items() {
    yield 1;
  }
  async *stream() {
    yield 2;
  }
}
