import { GemElement } from '@mantou/gem';
@customElement('my-a')
export class MyA extends GemElement {}
@customElement('my-b')
export class MyB extends GemElement {
  constructor(arg) {
    super(arg);
  }
}
