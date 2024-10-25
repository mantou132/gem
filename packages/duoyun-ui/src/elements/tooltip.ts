import { customElement } from '@mantou/gem/lib/decorators';

import { theme } from '../lib/theme';

import { DuoyunPopoverElement } from './popover';

@customElement('dy-tooltip')
export class DuoyunTooltipElement extends DuoyunPopoverElement {
  static ghostStyle: (typeof DuoyunPopoverElement)['ghostStyle'] = {
    '--bg': theme.highlightColor,
    '--color': theme.backgroundColor,
    maxWidth: '15em',
  };
}
