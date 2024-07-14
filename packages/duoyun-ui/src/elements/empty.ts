import { connectStore, adoptedStyle, customElement, property, shadow } from '@mantou/gem/lib/decorators';
import { GemElement, html, TemplateResult } from '@mantou/gem/lib/element';
import { createCSSSheet, css } from '@mantou/gem/lib/utils';

import { locale } from '../lib/locale';

import './use';

const style = createCSSSheet(css`
  :host(:where(:not([hidden]))) {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1em;
  }
  .icon {
    width: 3em;
  }
`);

/**
 * @customElement dy-empty
 */
@customElement('dy-empty')
@adoptedStyle(style)
@connectStore(locale)
@shadow()
export class DuoyunEmptyElement extends GemElement {
  @property icon?: string | Element | DocumentFragment;
  @property description?: string | TemplateResult;

  render = () => {
    return html`
      ${this.icon ? html`<dy-use class="icon" .element=${this.icon}></dy-use>` : ''}
      <div>${this.description || locale.noData}</div>
    `;
  };
}
