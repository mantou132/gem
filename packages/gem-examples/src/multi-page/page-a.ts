import { GemElement, html } from '@mantou/gem';

import api from './api';
import { pageA } from './store';

customElements.define(
  'app-page-a',
  class extends GemElement {
    static observedStores = [pageA];
    mounted() {
      api.getData();
    }
    render() {
      return html`<slot></slot> ${pageA.text}`;
    }
  },
);
