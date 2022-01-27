import { connectStore, adoptedStyle, customElement } from '@mantou/gem/lib/decorators';
import { GemElement, html } from '@mantou/gem/lib/element';
import { createCSSSheet, css } from '@mantou/gem/lib/utils';

import { locale } from '../lib/locale';

const style = createCSSSheet(css`
  :host {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
`);

/**
 * @customElement dy-empty
 */
@customElement('dy-empty')
@adoptedStyle(style)
@connectStore(locale)
export class DuoyunEmptyElement extends GemElement {
  render = () => {
    return html`<div>${locale.noData}</div>`;
  };
}
