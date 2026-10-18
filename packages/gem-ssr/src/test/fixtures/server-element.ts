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

import { lazy, server } from '../../decorators';

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

@customElement('app-lazy-element')
@adoptedStyle(css`
  :scope {
    color: blue;
  }
`)
@lazy()
export class DemoLazyElement extends GemElement {
  @attribute text: string;

  #state = createState({ loaded: '' });

  @server()
  #load = async () => this.#state({ loaded: 'loaded' });

  @template()
  #render = () => html`<p>${this.text}:${this.#state.loaded}</p>`;
}

export const lazyElement = () => html`<app-lazy-element text="a"></app-lazy-element>`;

export { hiddenServerElement } from './hidden';
