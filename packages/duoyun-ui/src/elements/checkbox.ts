import { customElement } from '@mantou/gem/lib/decorators';
import { TapCheckboxElement, TapCheckboxGroupElement } from 'tap-ui/elements/checkbox';

@customElement('dy-checkbox')
export class DuoyunCheckboxElement extends TapCheckboxElement {}

@customElement('dy-checkbox-group')
export class DuoyunCheckboxGroupElement extends TapCheckboxGroupElement {}
