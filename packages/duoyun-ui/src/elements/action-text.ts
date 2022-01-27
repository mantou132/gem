import { GemElement, html } from '@mantou/gem/lib/element';
import { adoptedStyle, customElement, attribute, state } from '@mantou/gem/lib/decorators';
import { createCSSSheet, css } from '@mantou/gem/lib/utils';

import { theme } from '../lib/theme';
import { commonHandle } from '../lib/hotkeys';
import { focusStyle } from '../lib/styles';

import './tooltip';

const style = createCSSSheet(css`
  :host {
    display: inline-flex;
    overflow: hidden;
    text-overflow: ellipsis;
    cursor: default;
    line-height: 1.5;
    --color: initial;
    color: var(--color, inherit);
    border-radius: ${theme.normalRound};
  }
  :host(:where(:hover, :--active, [data-active])) {
    color: var(--color, ${theme.primaryColor});
    text-decoration: underline;
  }
  :host(:where(:lang(zh), :lang(ja), :lang(kr))) {
    text-underline-offset: 2px;
  }
`);

/**
 * @customElement dy-action-text
 */
@customElement('dy-action-text')
@adoptedStyle(style)
@adoptedStyle(focusStyle)
export class DuoyunActionTextElement extends GemElement {
  @attribute tooltip: string;
  @attribute color: string;
  @state active: boolean;

  constructor() {
    super();
    this.tabIndex = 0;
    this.internals.role = 'button';
    this.addEventListener('keydown', commonHandle);
  }

  render = () => {
    return html`
      <style>
        :host([color]) {
          --color: ${this.color};
        }
      </style>
      <dy-tooltip .content=${this.tooltip}>
        <slot></slot>
      </dy-tooltip>
    `;
  };
}
