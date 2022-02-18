// https://spectrum.adobe.com/page/in-line-alert/
import { adoptedStyle, customElement, attribute, property } from '@mantou/gem/lib/decorators';
import { GemElement, html } from '@mantou/gem/lib/element';
import { createCSSSheet, css } from '@mantou/gem/lib/utils';

import { theme } from '../lib/theme';
import { icons } from '../lib/icons';

import './use';
import './action-text';

const style = createCSSSheet(css`
  :host {
    --color: ${theme.neutralColor};
    display: flex;
    flex-direction: column;
    padding: 1.2em 1.5em;
    gap: 0.8em;
    border: 2px solid var(--color);
    border-radius: ${theme.normalRound};
  }
  :host([status='positive']) {
    --color: ${theme.positiveColor};
  }
  :host([status='notice']) {
    --color: ${theme.noticeColor};
  }
  :host([status='negative']) {
    --color: ${theme.negativeColor};
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
    color: var(--color);
  }
  .footer {
    text-align: right;
  }
`);

type Status = 'positive' | 'notice' | 'negative' | 'default';

/**
 * @customElement dy-alert
 */
@customElement('dy-alert')
@adoptedStyle(style)
export class DuoyunAlertElement extends GemElement {
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
    }
  }

  constructor() {
    super();
    this.internals.role = 'alert';
  }

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
