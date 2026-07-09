import { adoptedStyle, attribute, customElement, shadow, slot } from '@mantou/gem/lib/decorators';
import { css, GemElement, html } from '@mantou/gem/lib/element';

import { theme } from '../lib/theme';

const style = css`
  :host(:where(:not([hidden]))) {
    display: inline;
    color: ${theme.textColor};
  }
`;

@customElement('tap-text')
@adoptedStyle(style)
@shadow()
export class TapTextElement extends GemElement {
  @slot static unnamed: string;

  @attribute value: string;

  render = () => {
    return html`<slot>${this.value}</slot>`;
  };
}
