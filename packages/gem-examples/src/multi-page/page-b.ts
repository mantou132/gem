import { connectStore, customElement, GemElement, html, shadow } from '@mantou/gem';

import { pageB } from './store';

@connectStore(pageB)
@customElement('app-page-b')
@shadow()
export class App extends GemElement {
  render() {
    return html`<slot></slot> ${pageB.text}`;
  }
}
