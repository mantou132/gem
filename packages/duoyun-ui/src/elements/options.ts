import { customElement } from '@mantou/gem/lib/decorators';
import { TapOptionsElement } from 'tap-ui/elements/options';

export type { Adder, Option } from 'tap-ui/elements/options';
export { SEPARATOR } from 'tap-ui/elements/options';

@customElement('dy-options')
export class DuoyunOptionsElement extends TapOptionsElement {}
