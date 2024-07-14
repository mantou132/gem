import { GemElement, connectStore, customElement, html, shadow } from '@mantou/gem';

import api from './api';
import { pageA } from './store';

@connectStore(pageA)
@customElement('app-page-a')
@shadow()
export class App extends GemElement {
  mounted() {
    api.getData();
  }
  render() {
    return html`<slot></slot> ${pageA.text}`;
  }
}
