import { adoptedStyle, customElement, slot } from '@mantou/gem/lib/decorators';
import { GemElement } from '@mantou/gem/lib/element';
import { createCSSSheet, css } from '@mantou/gem/lib/utils';

import { theme } from '../lib/theme';

const style = createCSSSheet(css`
  :where(dy-paragraph:not([hidden])) {
    display: block;
    margin-block-end: 0.75em;
    line-height: 1.5;
  }
  :where(dy-paragraph):where(:lang(zh), :lang(ja), :lang(kr)) {
    line-height: 1.7;
  }
  :where(gem-link, dy-link):where(:not([hidden])) {
    display: inline-block;
    color: ${theme.primaryColor};
    text-decoration: underline;
  }
  :where(gem-link, dy-link):where(:lang(zh), :lang(ja), :lang(kr)) {
    text-underline-offset: 0.125em;
  }
  ul,
  ol {
    margin-block: 0 1em;
    padding: 0;
    list-style-position: inside;
  }
  li {
    padding-inline-start: 0.5em;
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
`);

/**
 * @customElement dy-paragraph
 */
@customElement('dy-paragraph')
@adoptedStyle(style)
export class DuoyunParagraphElement extends GemElement {
  @slot static unnamed: string;

  constructor() {
    super({ isLight: true });
    this.internals.role = 'paragraph';
  }
}
