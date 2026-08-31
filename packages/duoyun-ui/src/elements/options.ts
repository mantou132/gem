import { customElement } from '@mantou/gem/lib/decorators';
import { TapOptionsElement } from '@mantou/tap-ui/elements/options';

export type { Adder, Option } from '@mantou/tap-ui/elements/options';
export { SEPARATOR } from '@mantou/tap-ui/elements/options';

@customElement('dy-options')
export class DuoyunOptionsElement extends TapOptionsElement {}
