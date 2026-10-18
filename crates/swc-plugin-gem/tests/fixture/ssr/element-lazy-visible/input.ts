// @ts-nocheck
import { customElement, GemElement, html, template } from '@mantou/gem';
import { lazy } from '@mantou/gemkit';

@customElement('app-likes')
@lazy({ on: 'visible' })
export class AppLikesElement extends GemElement {
  @template()
  #content = () => html`<button>0</button>`;
}
