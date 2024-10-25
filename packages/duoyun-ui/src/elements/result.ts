import { GemElement, html, createCSSSheet } from '@mantou/gem/lib/element';
import { adoptedStyle, customElement, property, attribute, slot, shadow } from '@mantou/gem/lib/decorators';

import { theme } from '../lib/theme';
import type { StringList } from '../lib/types';

import type { Status } from './status-light';
import { getStatusColor } from './status-light';

import './use';
import './heading';
import './paragraph';
import './space';

const style = createCSSSheet`
  :host(:where(:not([hidden]))) {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  .header {
    margin-block: 1em 0.5em;
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
`;

@customElement('dy-result')
@adoptedStyle(style)
@shadow()
export class DuoyunResultElement extends GemElement {
  @slot static header: string;
  @slot static description: string;
  @slot static unnamed: string;

  @attribute status: Status;
  @attribute header: StringList<'slot'>;
  @attribute description: StringList<'slot'>;

  @property icon?: string | Element | DocumentFragment;
  @property illustrator?: string | Element | DocumentFragment;

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
      ${this.header
        ? html`
            <dy-heading lv="2" class="header">
              <slot name=${DuoyunResultElement.header}>${this.header}</slot>
            </dy-heading>
          `
        : ''}
      ${this.description
        ? html`
            <dy-paragraph class="description">
              <slot name=${DuoyunResultElement.description}>${this.description}</slot>
            </dy-paragraph>
          `
        : ''}
      <slot></slot>
    `;
  };
}
