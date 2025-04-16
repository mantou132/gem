import { connectStore, customElement, GemElement, html, mounted, shadow } from '@mantou/gem';

import api from './api';
import { pageA } from './store';

@connectStore(pageA)
@customElement('app-page-a')
@shadow()
export class App extends GemElement {
  @mounted()
  #init = () => {
    api.getData();
  };

  render() {
    return html`<slot></slot> ${pageA.text}`;
  }
}
