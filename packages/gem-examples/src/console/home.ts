import { connectStore, customElement, GemElement, template } from '@mantou/gem';
import { locationStore } from 'duoyun-ui/patterns/console';

@customElement('console-page-home')
@connectStore(locationStore)
export class ConsolePageHomeElement extends GemElement {
  @template()
  #render = () => {
    const text = `Current Path: ${locationStore.path}`;
    return html`
      <dy-heading style="margin-block: 0 1em"><dy-title inert></dy-title></dy-heading>
      <dy-code-block codelang="yaml" .textContent=${text}></dy-code-block>
    `;
  };
}
