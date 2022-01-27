import { adoptedStyle, customElement } from '@mantou/gem/lib/decorators';
import { createCSSSheet, css } from '@mantou/gem/lib/utils';
import { GemLinkElement, GemActiveLinkElement } from '@mantou/gem/elements/link';

import { commonHandle } from '../lib/hotkeys';
import { focusStyle } from '../lib/styles';

const style = createCSSSheet(css`
  :host {
    color: inherit;
    text-decoration: inherit;
  }
`);

/**
 * @customElement dy-link
 */
@customElement('dy-link')
@adoptedStyle(style)
@adoptedStyle(focusStyle)
export class DouyunLinkElement extends GemLinkElement {
  constructor() {
    super();
    this.tabIndex = 0;
    this.addEventListener('keydown', commonHandle);
  }
}

/**
 * @customElement dy-active-link
 */
@customElement('dy-active-link')
@adoptedStyle(style)
@adoptedStyle(focusStyle)
export class DuoyunActiveLinkElement extends GemActiveLinkElement {
  constructor() {
    super();
    this.tabIndex = 0;
    this.addEventListener('keydown', commonHandle);
  }
}
