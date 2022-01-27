import { adoptedStyle, customElement } from '@mantou/gem/lib/decorators';
import { GemElement } from '@mantou/gem/lib/element';
import { createCSSSheet, css } from '@mantou/gem/lib/utils';

import { theme } from '../lib/theme';

const style = createCSSSheet(css`
  dy-paragraph {
    display: block;
    margin-block-end: 0.75em;
    line-height: 1.5;
  }
  dy-paragraph:where(:lang(zh), :lang(ja), :lang(kr)) {
    line-height: 1.7;
  }
  gem-link,
  dy-link {
    display: inline-block;
    color: ${theme.primaryColor};
    text-decoration: underline;
  }
  :where(gem-link, dy-link):where(:lang(zh), :lang(ja), :lang(kr)) {
    text-underline-offset: 2px;
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
  kbd {
    font-family: monospace;
    margin-inline: 0.2em;
    padding: 0.15em 0.4em 0.1em;
    font-size: 0.9em;
    background: ${theme.lightBackgroundColor};
    border: 1px solid ${theme.borderColor};
    border-bottom-width: 2px;
    border-radius: ${theme.smallRound};
  }
`);

/**
 * @customElement dy-paragraph
 */
@customElement('dy-paragraph')
@adoptedStyle(style)
export class DuoyunParagraphElement extends GemElement {
  constructor() {
    super({ isLight: true });
    this.internals.role = 'paragraph';
  }
}
