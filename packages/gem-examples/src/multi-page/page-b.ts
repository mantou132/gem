import { connectStore, customElement, GemElement, shadow, template } from '@mantou/gem';

import { pageB } from './store';

@connectStore(pageB)
@customElement('app-page-b')
@shadow()
export class App extends GemElement {
  @template()
  #render = () => {
    return html`<slot></slot> ${pageB.text}`;
  };
}
