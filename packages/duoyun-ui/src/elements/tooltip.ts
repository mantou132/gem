import { customElement } from '@mantou/gem/lib/decorators';

import { theme } from '../lib/theme';

import { DuoyunPopoverElement } from './popover';

/**
 * @customElement dy-tooltip
 */
@customElement('dy-tooltip')
export class DuoyunTooltipElement extends DuoyunPopoverElement {
  ghostStyle = {
    '--bg': theme.highlightColor,
    '--color': theme.backgroundColor,
    'max-width': '15em',
  };
}
