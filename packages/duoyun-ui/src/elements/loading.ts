import { adoptedStyle, customElement } from '@mantou/gem/lib/decorators';
import { html } from '@mantou/gem/lib/element';
import { createCSSSheet, css } from '@mantou/gem/lib/utils';

import { icons } from '../lib/icons';

import { DuoyunVisibleBaseElement } from './base/visible';

import '@mantou/gem/elements/use';

const style = createCSSSheet(css`
  :host {
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
      <gem-use class="icon" .element=${icons.loading}></gem-use>
      <span class="describe"><slot></slot></span>
    `;
  };
}
