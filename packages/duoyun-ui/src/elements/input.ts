import { customElement } from '@mantou/gem/lib/decorators';
import { TapInputElement, TapInputGroupElement } from 'tap-ui/elements/input';

export type { DataList } from 'tap-ui/elements/input';

@customElement('dy-input')
export class DuoyunInputElement extends TapInputElement {}

@customElement('dy-input-group')
export class DuoyunInputGroupElement extends TapInputGroupElement {}
