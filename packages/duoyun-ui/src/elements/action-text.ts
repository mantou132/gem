import { createDecoratorTheme } from '@mantou/gem/helper/theme';
import { adoptedStyle, aria, attribute, customElement, mounted, shadow, slot, state } from '@mantou/gem/lib/decorators';
import { css, GemElement, html } from '@mantou/gem/lib/element';
import { addListener } from '@mantou/gem/lib/utils';

import { commonHandle } from '../lib/hotkeys';
import { focusStyle } from '../lib/styles';
import { getSemanticColor, theme } from '../lib/theme';

import './tooltip';

const elementTheme = createDecoratorTheme({ color: '', activeColor: '' });

const style = css`
  :host {
    overflow: hidden;
    text-overflow: ellipsis;
    cursor: default;
    line-height: 1.5;
    color: ${elementTheme.color};
    border-radius: ${theme.normalRound};
  }
  :host(:where(:hover, :state(active))) {
    color: ${elementTheme.activeColor};
    text-decoration: underline;
  }
  :host(:where(:lang(zh), :lang(ja), :lang(kr))) {
    text-underline-offset: 0.125em;
  }
`;

@customElement('dy-action-text')
@adoptedStyle(style)
@adoptedStyle(focusStyle)
@shadow()
@aria({ focusable: true, role: 'button' })
export class DuoyunActionTextElement extends GemElement {
  @slot static unnamed: string;

  @attribute tooltip: string;
  @attribute color: string;
  @state active: boolean;

  @mounted()
  #init = () => addListener(this, 'keydown', commonHandle);

  @elementTheme()
  #theme = () => {
    const color = getSemanticColor(this.color) || this.color;
    return { color: color || 'inherit', activeColor: color || theme.primaryColor };
  };

  render = () => {
    return html`
      <dy-tooltip .content=${this.tooltip}>
        <slot></slot>
      </dy-tooltip>
    `;
  };
}
