import { connectStore, customElement, effect, state } from '@mantou/gem';
import { GemActiveLinkElement } from '@mantou/gem/elements/link';

import { locationStore } from '../store';

@customElement('gem-book-side-link')
@connectStore(locationStore)
export class GemBookSideLinkElement extends GemActiveLinkElement {
  @state match: boolean;

  @effect(() => [locationStore.path, locationStore.query])
  #updateState = () => (this.match = this.active);
}
