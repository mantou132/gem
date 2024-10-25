// https://spectrum.adobe.com/page/in-line-alert/
import { adoptedStyle, customElement, attribute, property, slot, aria, shadow } from '@mantou/gem/lib/decorators';
import { GemElement, html, createCSSSheet } from '@mantou/gem/lib/element';
import { createDecoratorTheme } from '@mantou/gem/helper/theme';

import { theme, getSemanticColor } from '../lib/theme';
import { icons } from '../lib/icons';

import './use';
import './action-text';

const elementTheme = createDecoratorTheme({ color: '' });

const style = createCSSSheet`
  :host(:where(:not([hidden]))) {
    display: flex;
    flex-direction: column;
    padding: 1.2em 1.5em;
    gap: 0.8em;
    border: 2px solid ${elementTheme.color};
    border-radius: ${theme.normalRound};
  }
  .header {
    display: flex;
    gap: 1em;
  }
  .title {
    flex-grow: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 500;
  }
  .content {
    color: ${theme.describeColor};
    font-size: 0.875em;
  }
  .icon {
    width: 1.5em;
    color: ${elementTheme.color};
  }
  .footer {
    text-align: right;
  }
`;

type Status = 'positive' | 'notice' | 'negative' | 'informative' | 'default';

@customElement('dy-alert')
@adoptedStyle(style)
@aria({ role: 'alert' })
@shadow()
export class DuoyunAlertElement extends GemElement {
  @slot static unnamed: string;

  @attribute header: string;
  @attribute status: Status;

  @property action?: { text: string; handle: () => void };

  get #icon() {
    switch (this.status) {
      case 'positive':
        return icons.success;
      case 'notice':
        return icons.warning;
      case 'negative':
        return icons.error;
      case 'informative':
        return icons.info;
    }
  }

  @elementTheme()
  #theme = () => ({ color: getSemanticColor(this.status) || theme.neutralColor });

  render = () => {
    const icon = this.#icon;
    return html`
      <div class="header">
        <div class="title">${this.header}</div>
        ${icon ? html`<dy-use class="icon" .element=${icon}></dy-use>` : ''}
      </div>
      <div class="content">
        <slot></slot>
      </div>
      ${this.action
        ? html`
            <div class="footer">
              <dy-action-text @click=${this.action.handle}>${this.action.text}</dy-action-text>
            </div>
          `
        : ''}
    `;
  };
}
