import { adoptedStyle, customElement } from '@mantou/gem/lib/decorators';
import { css } from '@mantou/gem/lib/element';
import { TapStepperElement } from '@mantou/tap-ui/elements/stepper';

// 桌面端控件高度，与 dy-button、dy-select 等一致
const style = css`
  :host(:where(:not([hidden]))) {
    block-size: calc(2.2em + 2px);
  }
`;

@customElement('dy-stepper')
@adoptedStyle(style)
export class DuoyunStepperElement extends TapStepperElement {}
