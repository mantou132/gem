import { GemElement, html, TemplateResult } from '@mantou/gem/lib/element';
import { adoptedStyle, customElement, property, attribute, slot } from '@mantou/gem/lib/decorators';
import { createCSSSheet, css } from '@mantou/gem/lib/utils';

import { theme } from '../lib/theme';

import { Status, getStatusColor } from './status-light';

import './use';
import './heading';
import './paragraph';
import './space';

const style = createCSSSheet(css`
  :host(:where(:not([hidden]))) {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  .header {
    margin-block-start: 1em;
    color: ${theme.textColor};
  }
  .icon {
    width: 5em;
  }
  .illustrator {
    color: ${theme.neutralColor};
    width: 10em;
  }
  .description {
    color: ${theme.describeColor};
    font-style: italic;
  }
  slot::slotted(*) {
    margin-block-start: 1em;
  }
`);

/**
 * @customElement dy-result
 */
@customElement('dy-result')
@adoptedStyle(style)
export class DuoyunResultElement extends GemElement {
  @slot static unnamed: string;

  @attribute status: Status;

  @property icon?: string | Element | DocumentFragment;
  @property illustrator?: string | Element | DocumentFragment;
  @property header?: string | TemplateResult;
  @property description?: string | TemplateResult;

  get #status() {
    return this.status || 'default';
  }

  get #color() {
    return getStatusColor(this.#status);
  }

  render = () => {
    return html`
      ${this.icon ? html`<dy-use class="icon" style="color:${this.#color}" .element=${this.icon}></dy-use>` : ''}
      ${this.illustrator ? html`<dy-use class="illustrator" .element=${this.illustrator}></dy-use>` : ''}
      ${this.header ? html`<dy-heading lv="2" class="header">${this.header}</dy-heading>` : ''}
      ${this.description ? html`<dy-paragraph class="description">${this.description}</dy-paragraph>` : ''}
      <slot></slot>
    `;
  };
}
