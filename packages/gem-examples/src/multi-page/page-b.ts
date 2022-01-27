import { GemElement, html } from '@mantou/gem';

import storeSet from './store';

customElements.define(
  'app-page-b',
  class extends GemElement {
    static observedStores = [storeSet.pageB];
    render() {
      return html`<slot></slot> ${storeSet.pageB.text}`;
    }
  },
);
