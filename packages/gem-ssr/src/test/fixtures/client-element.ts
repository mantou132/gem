import { attribute, customElement, GemElement, html, property, template } from '@mantou/gem';

import { client } from '../../decorators';

export const renders: string[] = [];

// jsdom 不支持声明式 ShadowDOM，使用 light DOM
@customElement('app-client-element')
@client()
export class DemoClientElement extends GemElement {
  @attribute text: string;
  @property data?: { n: number };

  @template()
  #render = () => {
    renders.push(`${this.text}:${this.data?.n}`);
    return html`<p>${this.text}:${this.data?.n}</p>`;
  };
}

@customElement('app-client-parent')
export class DemoClientParentElement extends GemElement {
  @template()
  #render = () => html`<app-client-element text="a" .data=${{ n: 1 }}></app-client-element><b>${'b'}</b>`;
}

export const clientElement = () => html`<app-client-parent></app-client-parent>`;
