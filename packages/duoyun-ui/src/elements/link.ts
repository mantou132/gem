import { GemActiveLinkElement, GemLinkElement } from '@mantou/gem/elements/base/link';
import { adoptedStyle, customElement, mounted } from '@mantou/gem/lib/decorators';
import { css } from '@mantou/gem/lib/element';
import { addListener } from '@mantou/gem/lib/utils';

import { commonHandle } from '../lib/hotkeys';
import { focusStyle } from '../lib/styles';
import { theme } from '../lib/theme';

export * from '@mantou/gem/elements/base/link';

const style = css`
  :host {
    color: inherit;
    text-decoration: inherit;
    border-radius: ${theme.normalRound};
  }
`;

@customElement('dy-link')
@adoptedStyle(style)
@adoptedStyle(focusStyle)
export class DuoyunLinkElement extends GemLinkElement {
  @mounted()
  #init = () => addListener(this, 'keydown', commonHandle);
}

@customElement('dy-active-link')
@adoptedStyle(style)
@adoptedStyle(focusStyle)
export class DuoyunActiveLinkElement extends GemActiveLinkElement {
  @mounted()
  #init = () => addListener(this, 'keydown', commonHandle);
}
