import { adoptedStyle, customElement } from '@mantou/gem/lib/decorators';
import { css, type Metadata } from '@mantou/gem/lib/element';
import { TapButtonElement } from '@mantou/tap-ui/elements/button';

const style = css`
  :host {
    height: auto;
  }
`;

// 让 tap-button 样式等于 dy-button
(TapButtonElement[Symbol.metadata] as Metadata).adoptedStyleSheets?.push(style);

@customElement('dy-button')
@adoptedStyle(style)
export class DuoyunButtonElement extends TapButtonElement {}
