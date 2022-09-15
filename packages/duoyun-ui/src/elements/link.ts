import { adoptedStyle, customElement } from '@mantou/gem/lib/decorators';
import { createCSSSheet, css } from '@mantou/gem/lib/utils';
import { GemLinkElement, GemActiveLinkElement } from '@mantou/gem/elements/base/link';

import { commonHandle } from '../lib/hotkeys';
import { focusStyle } from '../lib/styles';

export * from '@mantou/gem/elements/base/link';

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
export class DuoyunLinkElement extends GemLinkElement {
  constructor() {
    super();
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
    this.addEventListener('keydown', commonHandle);
  }
}
