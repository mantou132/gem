import { GemElement, connectStore, customElement, html } from '@mantou/gem';

import api from './api';
import { pageA } from './store';

@connectStore(pageA)
@customElement('app-page-a')
export class App extends GemElement {
  mounted() {
    api.getData();
  }
  render() {
    return html`<slot></slot> ${pageA.text}`;
  }
}
