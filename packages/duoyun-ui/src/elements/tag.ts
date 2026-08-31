import { customElement } from '@mantou/gem/lib/decorators';
import { TapTagElement } from '@mantou/tap-ui/elements/tag';

export type { PresetColor } from '@mantou/tap-ui/elements/tag';

@customElement('dy-tag')
export class DuoyunTagElement extends TapTagElement {}
