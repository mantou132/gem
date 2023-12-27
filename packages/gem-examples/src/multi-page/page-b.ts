import { GemElement, html } from '@mantou/gem';

import { pageB } from './store';

customElements.define(
  'app-page-b',
  class extends GemElement {
    static observedStores = [pageB];
    render() {
      return html`<slot></slot> ${pageB.text}`;
    }
  },
);
