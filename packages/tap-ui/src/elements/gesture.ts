import { GemGestureElement } from '@mantou/gem/elements/base/gesture';
import { customElement } from '@mantou/gem/lib/decorators';

export * from '@mantou/gem/elements/base/gesture';

@customElement('tap-gesture')
export class TapGestureElement extends GemGestureElement {}
