import { adoptedStyle, attribute, customElement, shadow, slot } from '@mantou/gem/lib/decorators';
import { css, GemElement, html } from '@mantou/gem/lib/element';

import { theme } from '../lib/theme';

const style = css`
  :host(:where(:not([hidden]))) {
    display: block;
    color: ${theme.textColor};
  }
  .title {
    margin-block-end: 0.5em;
    font-size: 1em;
    font-weight: 600;
  }
`;

@customElement('tap-pat-section')
@adoptedStyle(style)
@shadow()
export class TapPatSectionElement extends GemElement {
  @slot static unnamed: string;

  @attribute heading: string;

  render = () => {
    return html`
      <div class="title" v-if=${!!this.heading}>${this.heading}</div>
      <slot></slot>
    `;
  };
}
