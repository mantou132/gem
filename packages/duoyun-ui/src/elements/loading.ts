import { adoptedStyle, customElement, shadow, slot } from '@mantou/gem/lib/decorators';
import { html, css } from '@mantou/gem/lib/element';

import { icons } from '../lib/icons';

import { DuoyunVisibleBaseElement } from './base/visible';

import './use';

const style = css`
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
`;

@customElement('dy-loading')
@adoptedStyle(style)
@shadow()
export class DuoyunLoadingElement extends DuoyunVisibleBaseElement {
  @slot static unnamed: string;

  render = () => {
    return html`
      <dy-use class="icon" .element=${icons.loading}></dy-use>
      <span class="describe"><slot></slot></span>
    `;
  };
}
