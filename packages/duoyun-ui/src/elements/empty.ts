import {
  connectStore,
  adoptedStyle,
  customElement,
  property,
  shadow,
  attribute,
  slot,
} from '@mantou/gem/lib/decorators';
import { GemElement, html, css, render } from '@mantou/gem/lib/element';

import { locale } from '../lib/locale';
import { theme } from '../lib/theme';

import './use';

const style = css`
  :host(:where(:not([hidden]))) {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1em;
    color: ${theme.describeColor};
  }
  .icon {
    width: 5em;
  }
`;

@customElement('dy-empty')
@adoptedStyle(style)
@connectStore(locale)
@shadow()
export class DuoyunEmptyElement extends GemElement {
  @slot static unnamed: string;

  @property icon?: string | Element | DocumentFragment;
  @attribute text: string;
  @attribute slotName: string;

  render = () => {
    if (this.slotName && !this.text) {
      render(html`<slot name=${this.slotName}></slot>`, this);
    } else {
      this.innerHTML = '';
    }
    return html`
      <dy-use v-if=${!!this.icon} class="icon" .element=${this.icon}></dy-use>
      <div><slot>${this.text || locale.noData}</slot></div>
    `;
  };
}
