import { adoptedStyle, aria, boolattribute, customElement, shadow, slot, template } from '@mantou/gem/lib/decorators';
import { css, GemElement, html } from '@mantou/gem/lib/element';

import { focusStyle } from '../lib/styles';
import { theme } from '../lib/theme';

const style = css`
  :host(:where(:not([hidden]))) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    min-height: 2.75em;
    padding: 0.5em 1.25em;
    border: none;
    border-radius: ${theme.normalRound};
    background: ${theme.primaryColor};
    color: ${theme.backgroundColor};
    font: inherit;
    font-weight: 600;
    line-height: 1.3;
    cursor: pointer;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
  }
  :host(:active:not([disabled])) {
    filter: brightness(0.92);
  }
  :host([disabled]) {
    cursor: not-allowed;
    opacity: 0.35;
    pointer-events: none;
  }
`;

@customElement('tap-button')
@adoptedStyle(style)
@adoptedStyle(focusStyle)
@shadow({ delegatesFocus: true })
@aria({ role: 'button' })
export class TapButtonElement extends GemElement {
  @slot static unnamed: string;

  @boolattribute disabled: boolean;

  @template()
  #content = () => html`<slot></slot>`;
}
