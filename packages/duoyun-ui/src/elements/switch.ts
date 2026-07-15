import { customElement, mounted } from '@mantou/gem/lib/decorators';
import { addListener } from '@mantou/gem/lib/utils';
import { TapSwitchElement } from 'tap-ui/elements/switch';

import { commonHandle } from '../lib/hotkeys';

@customElement('dy-switch')
export class DuoyunSwitchElement extends TapSwitchElement {
  @mounted()
  #initKeydown = () => addListener(this, 'keydown', commonHandle);
}
