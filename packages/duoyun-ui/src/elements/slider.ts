import { adoptedStyle, customElement } from '@mantou/gem/lib/decorators';
import { css } from '@mantou/gem/lib/element';
import { TapSliderElement } from '@mantou/tap-ui/elements/slider';

// 桌面端控件高度与 dy-input 等一致，标签浮在滑杆上方、不占高度，使滑杆与同一行的其他控件对齐
const style = css`
  :host(:where(:not([hidden]))),
  :host([label]:not([orientation='vertical'])) {
    block-size: calc(2.2em + 2px);
    padding-block-start: 0;
  }
  /* 可编辑时的输入框 */
  .input {
    block-size: calc(2.2em + 2px);
  }
`;

@customElement('dy-slider')
@adoptedStyle(style)
export class DuoyunSliderElement extends TapSliderElement {}
