import { GemElement } from '@mantou/gem';
@customElement('my-element')
export class MyElement extends GemElement {
  ['on-click'] = () => 1;
}
