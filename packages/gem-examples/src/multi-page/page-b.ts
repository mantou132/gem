import { GemElement, connectStore, customElement, html } from '@mantou/gem';

import { pageB } from './store';

@connectStore(pageB)
@customElement('app-page-b')
export class App extends GemElement {
  render() {
    return html`<slot></slot> ${pageB.text}`;
  }
}
