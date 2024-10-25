import { adoptedStyle, customElement } from '@mantou/gem/lib/decorators';

import { blockContainer } from '../lib/styles';

import { DuoyunScrollBaseElement } from './base/scroll';

@customElement('dy-scroll-box')
@adoptedStyle(blockContainer)
export class DuoyunScrollBoxElement extends DuoyunScrollBaseElement {}
