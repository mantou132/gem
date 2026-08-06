import { adoptedStyle, customElement } from '@mantou/gem/lib/decorators';
import { css } from '@mantou/gem/lib/element';
import { TapButtonElement } from 'tap-ui/elements/button';

const style = css`
  :host {
    height: auto;
  }
`;

@customElement('dy-button')
@adoptedStyle(style)
export class DuoyunButtonElement extends TapButtonElement {}
