// https://spectrum.adobe.com/page/alert-banner/
import {
  adoptedStyle,
  customElement,
  attribute,
  emitter,
  Emitter,
  property,
  boolattribute,
} from '@mantou/gem/lib/decorators';
import { GemElement, html } from '@mantou/gem/lib/element';
import { createCSSSheet, css } from '@mantou/gem/lib/utils';

import { theme } from '../lib/theme';
import { icons } from '../lib/icons';
import { commonHandle } from '../lib/hotkeys';

import '@mantou/gem/elements/use';
import './divider';

const style = createCSSSheet(css`
  :host {
    display: flex;
    align-items: flex-start;
    background: ${theme.neutralColor};
    color: #fff;
    padding: 0.8em;
    line-height: 1.5;
    gap: 0.5em;
  }
  :host > * {
    flex-shrink: 0;
  }
  :host([status='positive']) {
    background: ${theme.positiveColor};
  }
  :host([status='notice']) {
    background: ${theme.noticeColor};
  }
  :host([status='negative']) {
    background: ${theme.negativeColor};
  }
  .icon {
    width: 1.5em;
  }
  .content {
    flex-grow: 1;
  }
  .action {
    color: inherit;
    background: transparent;
    border-radius: 10em;
    border: 2px solid #fff9;
    padding: 0 1em;
    font-size: 1em;
    line-height: 1.5;
    margin-block: -2px;
  }
  .action:hover {
    border-color: #fff;
  }
  .divider {
    align-self: stretch;
  }
  .close {
    width: 1.2em;
    padding: 0.15em;
    opacity: 0.8;
  }
  .close:hover {
    opacity: 1;
  }
`);

type Status = 'positive' | 'notice' | 'negative' | 'default';

/**
 * @customElement dy-banner
 */
@customElement('dy-banner')
@adoptedStyle(style)
export class DuoyunBannerElement extends GemElement {
  @boolattribute closeable: boolean;
  @attribute status: Status;

  @property action?: { text: string; handle: () => void };

  @emitter close: Emitter<null>;

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
    this.internals.role = 'banner';
  }

  render = () => {
    const icon = this.#icon;
    return html`
      ${icon ? html`<gem-use class="icon" .element=${icon}></gem-use>` : ''}
      <div class="content">
        <slot></slot>
      </div>
      ${this.action
        ? html`
            <button class="action" @keydown=${commonHandle} @click=${this.action.handle}>${this.action.text}</button>
          `
        : ''}
      ${this.closeable
        ? html`
            <dy-divider class="divider" orientation="vertical"></dy-divider>
            <gem-use
              role="button"
              class="close"
              .element=${icons.close}
              @click=${() => this.close(null)}
              @keydown=${commonHandle}
            ></gem-use>
          `
        : ''}
    `;
  };
}
