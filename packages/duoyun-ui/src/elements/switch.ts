import { adoptedStyle, customElement } from '@mantou/gem/lib/decorators';
import { css } from '@mantou/gem/lib/element';
import { TapSwitchElement } from 'tap-ui/elements/switch';

const style = css`
  .switch {
    height: 1.2em;
  }
`;

@customElement('dy-switch')
@adoptedStyle(style)
export class DuoyunSwitchElement extends TapSwitchElement {}
