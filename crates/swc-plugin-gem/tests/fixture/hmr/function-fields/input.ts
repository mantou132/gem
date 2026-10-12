// @ts-nocheck
@customElement('my-element')
export class MyElement extends GemElement {
  static create() {}
  #handle = () => {};
  method() {}
  @effect()
  #effect = () => {};
}
