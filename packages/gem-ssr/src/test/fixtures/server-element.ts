import {
  adoptedStyle,
  attribute,
  createState,
  css,
  customElement,
  GemElement,
  html,
  property,
  template,
} from '@mantou/gem';

import { server } from '../../decorators';

@customElement('app-server-element')
@adoptedStyle(css`
  :scope {
    color: red;
  }
`)
@server()
export class DemoServerElement extends GemElement {
  @attribute text: string;
  @property data?: { n: number };

  #state = createState({ loaded: '' });

  @server()
  #load = async () => this.#state({ loaded: 'loaded' });

  @template()
  #render = () => html`<p>${this.text}:${this.data?.n}:${this.#state.loaded}</p>`;
}

export const serverElement = () => html`<app-server-element text="a" .data=${{ n: 1 }}></app-server-element>`;
