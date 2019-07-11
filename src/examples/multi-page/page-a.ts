import { GemElement, html } from '../../';
import storeSet from './store';
import api from './api';

customElements.define(
  'app-page-a',
  class extends GemElement {
    static observedStores = [storeSet.pageA];
    mounted() {
      api.getData();
    }
    render() {
      return html`
        <slot></slot> ${storeSet.pageA.text}
      `;
    }
  },
);
