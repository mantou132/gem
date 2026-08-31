import { customElement } from '@mantou/gem/lib/decorators';
import { TapRadioElement, TapRadioGroupElement } from '@mantou/tap-ui/elements/radio';

export type { Option } from '@mantou/tap-ui/elements/radio';
export { groupStyle } from '@mantou/tap-ui/elements/radio';

@customElement('dy-radio')
export class DuoyunRadioElement extends TapRadioElement {}

@customElement('dy-radio-group')
export class DuoyunRadioGroupElement extends TapRadioGroupElement {}
