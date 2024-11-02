import { css } from '@mantou/gem/lib/element';

import { theme } from '../lib/theme';

// global style: `::selection`, `::target-text`, `::highlight`
// https://bugzilla.mozilla.org/show_bug.cgi?id=1868009
export const focusStyle = css`
  :host(:where(:focus)),
  :where(:focus) {
    outline: none;
  }
  :host(:where(:focus-visible)),
  :where(:focus-visible) {
    outline: 2px solid ${theme.focusColor};
    outline-offset: -2px;
  }
`;

function createContainer(display: string) {
  return css`
    @layer {
      :host(:where(:not([hidden]))),
      :where(:scope:not([hidden])) {
        display: ${display};
      }
    }
  `;
}

export const blockContainer = createContainer('block');

export const flexContainer = createContainer('flex');

export const contentsContainer = createContainer('contents');
