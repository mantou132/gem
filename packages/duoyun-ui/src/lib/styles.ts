import { createCSSSheet, css } from '@mantou/gem/lib/utils';
import { html } from '@mantou/gem/lib/element';

import { theme } from '../lib/theme';

// global style: `::selection`, `::target-text`, `::highlight`
// https://bugzilla.mozilla.org/show_bug.cgi?id=1868009
export const focusStyle = createCSSSheet(css`
  :host(:where(:focus)),
  :where(:focus) {
    outline: none;
  }
  :host(:where(:focus-visible)),
  :where(:focus-visible) {
    outline: 2px solid ${theme.focusColor};
    outline-offset: -2px;
  }
`);

export const blockContainer = createCSSSheet(css`
  :host(:where(:not([hidden]))),
  :where(:scope:not([hidden])) {
    display: block;
  }
`);

export const flexContainer = createCSSSheet(css`
  :host(:where(:not([hidden]))),
  :where(:scope:not([hidden])) {
    display: flex;
  }
`);

export const contentsContainer = createCSSSheet(css`
  :host(:where(:not([hidden]))),
  :where(:scope:not([hidden])) {
    display: contents;
  }
`);

export const noneTemplate = html`
  <style>
    :host,
    :scope {
      display: none;
    }
  </style>
`;
