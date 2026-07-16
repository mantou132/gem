import { GemUnsafeElement } from '@mantou/gem/elements/base/unsafe';
import { customElement } from '@mantou/gem/lib/decorators';

export * from '@mantou/gem/elements/base/unsafe';

@customElement('tap-unsafe')
export class TapUnsafeElement extends GemUnsafeElement {}
