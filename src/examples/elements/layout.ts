import { GemElement, html } from '../../lib/element';
import { customElement, slot } from '../../lib/decorators';
import '../../elements/reflect';
import '../../elements/title';

import { MATADATA, EXAMPLE } from './env';
import './nav';
import './source';

@customElement('gem-examples-layout')
export class Layout extends GemElement {
  @slot main: string;

  render() {
    return html`
      <gem-title suffix=" - Gem Examples" hidden>${MATADATA[EXAMPLE].name || EXAMPLE}</gem-title>
      <gem-reflect>
        <style>
          body {
            margin: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans',
              sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji';
          }
        </style>
      </gem-reflect>
      <style>
        :host {
          display: grid;
          grid-template-areas: 'nav main' 'nav source';
          grid-template-columns: 260px 1fr;
          grid-template-rows: 1fr 400px;
          height: 100vh;
        }
        ::slotted(*) {
          overflow: auto;
          padding: 2em;
        }
        @media (max-width: 480px) {
          :host {
            display: block;
          }
          gem-examples-nav,
          gem-examples-source {
            display: none;
          }
        }
      </style>
      <gem-examples-nav></gem-examples-nav>
      <slot name=${this.main}></slot>
      <gem-examples-source></gem-examples-source>
    `;
  }
}
