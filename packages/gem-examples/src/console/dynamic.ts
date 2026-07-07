import { locationStore } from 'duoyun-ui/patterns/console';

@customElement('console-page-dynamic')
@connectStore(locationStore)
export class ConsolePageDynamicElement extends GemElement {
  @template()
  #render = () => {
    return html`
      <dy-heading style="margin-block: 0 1em"><dy-title inert></dy-title></dy-heading>
      <dy-code-block codelang="json">${JSON.stringify(locationStore.params, null, 2)}</dy-code-block>
    `;
  };
}
