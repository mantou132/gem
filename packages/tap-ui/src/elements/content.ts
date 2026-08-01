import { adoptedStyle, customElement } from '@mantou/gem/lib/decorators';
import { css, GemElement } from '@mantou/gem/lib/element';

import { theme } from '../lib/theme';

const style = css`
  :scope:where(:not([hidden])) {
    display: block;
    box-sizing: border-box;
    padding: ${theme.pageGutter};
  }
`;

/** Standard padded content container for pages. */
@customElement('tap-content')
@adoptedStyle(style)
export class TapContentElement extends GemElement {}
