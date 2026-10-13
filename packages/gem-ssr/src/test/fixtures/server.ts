import { createState, customElement, GemElement, html, mounted, template } from '@mantou/gem';

import { server } from '../../decorators';

export const counter = { calls: 0, methodCalls: 0 };

@customElement('app-server-inner')
export class DemoServerInnerElement extends GemElement {
  #state = createState({ text: '' });

  @server()
  @mounted()
  #load = async () => {
    counter.calls++;
    this.#state({ text: await Promise.resolve('inner') });
  };

  @template()
  #render = () => html`<i>${this.#state.text}</i>`;
}

@customElement('app-server-method')
export class DemoServerMethodElement extends GemElement {
  @server()
  load = () => {
    counter.methodCalls++;
  };
}

@customElement('app-server-outer')
export class DemoServerOuterElement extends GemElement {
  #state = createState({ loaded: false, text: '' });

  @server()
  @mounted()
  #load = async () => {
    counter.calls++;
    await new Promise((resolve) => setTimeout(resolve, 10));
    this.#state({ loaded: true, text: '<outer>' });
  };

  @template()
  #render = () => html`
    <b>${this.#state.text}</b>
    <app-server-inner v-if=${this.#state.loaded}></app-server-inner>
  `;
}

export const outer = () => html`<app-server-outer></app-server-outer>`;
export const method = () => html`<app-server-method></app-server-method>`;
