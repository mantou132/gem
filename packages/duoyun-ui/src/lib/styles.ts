import { createCSSSheet, css } from '@mantou/gem/lib/utils';

import { theme } from '../lib/theme';

export const focusStyle = createCSSSheet(css`
  :host(:focus),
  :focus {
    outline: none;
  }
  :host(:focus-visible),
  :focus-visible {
    outline: 2px solid ${theme.focusColor};
    outline-offset: -2px;
  }
`);
