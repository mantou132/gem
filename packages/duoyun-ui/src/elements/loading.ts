import { adoptedStyle, customElement } from '@mantou/gem/lib/decorators';
import { html } from '@mantou/gem/lib/element';
import { createCSSSheet, css } from '@mantou/gem/lib/utils';

import { icons } from '../lib/icons';

import { DuoyunVisibleBaseElement } from './base/visible';

import './use';

const style = createCSSSheet(css`
  :host(:where(:not([hidden]))) {
    position: relative;
    display: inline-flex;
    align-items: center;
    font-size: 0.875em;
  }
  .icon {
    width: 2em;
  }
  .describe {
    opacity: 0.7;
  }
`);

/**
 * @customElement dy-loading
 */
@customElement('dy-loading')
@adoptedStyle(style)
export class DuoyunLoadingElement extends DuoyunVisibleBaseElement {
  render = () => {
    return html`
      <dy-use class="icon" .element=${icons.loading}></dy-use>
      <span class="describe"><slot></slot></span>
    `;
  };
}
