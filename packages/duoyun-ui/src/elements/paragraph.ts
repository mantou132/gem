import { adoptedStyle, aria, customElement } from '@mantou/gem/lib/decorators';
import { GemElement, createCSSSheet } from '@mantou/gem/lib/element';
import { css } from '@mantou/gem/lib/utils';

import { theme } from '../lib/theme';

const style = createCSSSheet(css`
  :where(:scope:not([hidden])) {
    display: block;
    margin-block-end: 0.75em;
    line-height: 1.5;

    &:where(:lang(zh), :lang(ja), :lang(kr)) {
      line-height: 1.7;

      :where(gem-link, dy-link, a[href]) {
        text-underline-offset: 0.125em;
      }
    }

    :where(gem-link, dy-link, a[href]) {
      color: ${theme.primaryColor};
      text-decoration: underline;

      &:where(:not([hidden])) {
        display: inline-block;
      }
    }
    code,
    kbd {
      font-family: ${theme.codeFont};
      margin-inline: 0.2em;
      padding: 0.15em 0.4em 0.1em;
      font-size: 0.9em;
      border: 1px solid ${theme.borderColor};
      border-radius: ${theme.smallRound};
    }
    code {
      background: ${theme.hoverBackgroundColor};
    }
    kbd {
      background: ${theme.lightBackgroundColor};
      border-bottom-width: 2px;
    }
  }
`);

/**
 * @customElement dy-paragraph
 */
@customElement('dy-paragraph')
@adoptedStyle(style)
@aria({ role: 'paragraph' })
export class DuoyunParagraphElement extends GemElement {}
