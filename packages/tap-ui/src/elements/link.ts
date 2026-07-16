import { GemActiveLinkElement, GemLinkElement } from '@mantou/gem/elements/base/link';
import { customElement } from '@mantou/gem/lib/decorators';

export * from '@mantou/gem/elements/base/link';

@customElement('tap-link')
export class TapLinkElement extends GemLinkElement {}

@customElement('tap-active-link')
export class TapActiveLinkElement extends GemActiveLinkElement {}
