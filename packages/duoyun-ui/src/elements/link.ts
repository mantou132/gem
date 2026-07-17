import { customElement } from '@mantou/gem/lib/decorators';
import { TapActiveLinkElement, TapLinkElement } from 'tap-ui/elements/link';

export * from '@mantou/gem/elements/base/link';

@customElement('dy-link')
export class DuoyunLinkElement extends TapLinkElement {}

@customElement('dy-active-link')
export class DuoyunActiveLinkElement extends TapActiveLinkElement {}
