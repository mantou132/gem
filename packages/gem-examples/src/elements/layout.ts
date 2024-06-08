import { GemElement, html } from '@mantou/gem/lib/element';
import { customElement } from '@mantou/gem/lib/decorators';

import '@mantou/gem/elements/reflect';
import '@mantou/gem/elements/title';

import './nav';

@customElement('gem-examples-layout')
export class Layout extends GemElement {
  render() {
    return html`
      <gem-title suffix=" - Gem Examples" hidden>${location.pathname}</gem-title>
      <gem-reflect>
        <style>
          body {
            margin: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans',
              sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji';
            overflow: hidden;
          }
        </style>
      </gem-reflect>
      <style>
        :host {
          display: grid;
          grid-template-areas: 'nav main' 'nav source';
          grid-template-columns: 260px 1fr;
          grid-template-rows: 1fr;
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
      <slot></slot>
    `;
  }
}
