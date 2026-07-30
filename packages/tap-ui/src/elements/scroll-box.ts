import { adoptedStyle, customElement } from '@mantou/gem/lib/decorators';

import { blockContainer } from '../lib/styles';
import { TapScrollBaseElement } from './base/scroll';

@customElement('tap-scroll-box')
@adoptedStyle(blockContainer)
export class TapScrollBoxElement extends TapScrollBaseElement {}
