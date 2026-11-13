import { adoptedStyle, customElement } from '@mantou/gem/lib/decorators';
import { css } from '@mantou/gem/lib/element';
import { TapInputElement, TapInputGroupElement } from '@mantou/tap-ui/elements/input';

export type { DataList } from '@mantou/tap-ui/elements/input';

// 桌面端控件高度，与 dy-button、dy-select 等一致
const style = css`
  :host(:not([type='textarea'])) {
    block-size: calc(2.2em + 2px);
  }
`;

@customElement('dy-input')
@adoptedStyle(style)
export class DuoyunInputElement extends TapInputElement {}

@customElement('dy-input-group')
export class DuoyunInputGroupElement extends TapInputGroupElement {}
