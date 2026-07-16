import { GemReflectElement } from '@mantou/gem/elements/base/reflect';
import { customElement } from '@mantou/gem/lib/decorators';

export * from '@mantou/gem/elements/base/reflect';

@customElement('tap-reflect')
export class TapReflectElement extends GemReflectElement {}
