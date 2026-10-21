import { GemElement, html, template } from '@mantou/gem';
import { page } from '@mantou/gemkit';

@page('Home')
export default class HomePage extends GemElement {
  @template()
  #content = () => html`
    <h1>Welcome to gemkit</h1>
    <p>Edit <code>src/pages/index.ts</code> to get started.</p>
    <app-counter></app-counter>
  `;
}
