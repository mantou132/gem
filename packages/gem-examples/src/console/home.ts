import { html, GemElement } from '@mantou/gem/lib/element';
import { connectStore, customElement } from '@mantou/gem/lib/decorators';
import { locationStore } from 'duoyun-ui/patterns/console';

import 'duoyun-ui/elements/code-block';
import 'duoyun-ui/elements/heading';
import 'duoyun-ui/elements/title';

@customElement('console-page-home')
@connectStore(locationStore)
export class ConsolePageHomeElement extends GemElement {
  render = () => {
    const text = `Current Path: ${locationStore.path}`;
    return html`
      <dy-heading style="margin-block: 0 1em"><dy-title inert></dy-title></dy-heading>
      <dy-code-block .textContent=${text}></dy-code-block>
    `;
  };
}
