import { customElement } from '@mantou/gem/lib/decorators';
import { TapTagElement } from 'tap-ui/elements/tag';

export type { PresetColor } from 'tap-ui/elements/tag';

@customElement('dy-tag')
export class DuoyunTagElement extends TapTagElement {}
