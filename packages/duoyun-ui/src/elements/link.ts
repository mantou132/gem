import { adoptedStyle, customElement, mounted } from '@mantou/gem/lib/decorators';
import { createCSSSheet } from '@mantou/gem/lib/element';
import { addListener, css } from '@mantou/gem/lib/utils';
import { GemLinkElement, GemActiveLinkElement } from '@mantou/gem/elements/base/link';

import { commonHandle } from '../lib/hotkeys';
import { focusStyle } from '../lib/styles';
import { theme } from '../lib/theme';

export * from '@mantou/gem/elements/base/link';

const style = createCSSSheet(css`
  :host {
    color: inherit;
    text-decoration: inherit;
    border-radius: ${theme.normalRound};
  }
`);

/**
 * @customElement dy-link
 */
@customElement('dy-link')
@adoptedStyle(style)
@adoptedStyle(focusStyle)
export class DuoyunLinkElement extends GemLinkElement {
  @mounted()
  #init = () => addListener(this, 'keydown', commonHandle);
}

/**
 * @customElement dy-active-link
 */
@customElement('dy-active-link')
@adoptedStyle(style)
@adoptedStyle(focusStyle)
export class DuoyunActiveLinkElement extends GemActiveLinkElement {
  @mounted()
  #init = () => addListener(this, 'keydown', commonHandle);
}
