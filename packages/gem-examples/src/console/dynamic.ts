import { connectStore, customElement } from '@mantou/gem/lib/decorators';
import { GemElement, html } from '@mantou/gem/lib/element';
import { locationStore } from 'duoyun-ui/patterns/console';

import 'duoyun-ui/elements/code-block';
import 'duoyun-ui/elements/heading';
import 'duoyun-ui/elements/title';

@customElement('console-page-dynamic')
@connectStore(locationStore)
export class ConsolePageDynamicElement extends GemElement {
  render = () => {
    return html`
      <dy-heading style="margin-block: 0 1em"><dy-title inert></dy-title></dy-heading>
      <dy-code-block codelang="json">${JSON.stringify(locationStore.params, null, 2)}</dy-code-block>
    `;
  };
}
