import { connectStore, customElement, shadow, state } from '@mantou/gem';
import { GemActiveLinkElement } from '@mantou/gem/elements/link';

import { locationStore } from '../store';

/**
 * @customElement gem-book-side-link
 */
@customElement('gem-book-side-link')
@connectStore(locationStore)
@shadow()
export class GemBookSideLinkElement extends GemActiveLinkElement {
  @state match: boolean;

  constructor() {
    super();
    this.effect(
      () => (this.match = this.active),
      () => [locationStore.path, locationStore.query],
    );
  }
}
