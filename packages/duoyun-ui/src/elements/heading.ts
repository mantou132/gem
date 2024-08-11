import { connectStore, adoptedStyle, customElement, attribute, slot, shadow, effect } from '@mantou/gem/lib/decorators';
import { GemElement, html, createCSSSheet } from '@mantou/gem/lib/element';
import { history } from '@mantou/gem/lib/history';
import { css } from '@mantou/gem/lib/utils';

import { theme } from '../lib/theme';

const style = createCSSSheet(css`
  :host(:where(:not([hidden]))) {
    display: block;
    font-size: 2.5em;
    line-height: 1;
    font-weight: bold;
    color: ${theme.highlightColor};
    margin-block: 0.75em 0.25em;
    scroll-margin-top: 1em;
  }
  :host([lv='2']) {
    font-size: 2em;
  }
  :host([lv='3']) {
    font-size: 1.5em;
  }
  :host([lv='4']) {
    font-size: 1.2em;
  }
  h1,
  h2,
  h3,
  h4 {
    display: contents;
    font: inherit;
    text-wrap: balance;
  }
`);

/**
 * @customElement dy-heading
 * @attr lv
 */
@customElement('dy-heading')
@adoptedStyle(style)
@connectStore(history.store)
@shadow()
export class DuoyunHeadingElement extends GemElement {
  @slot static unnamed: string;

  @attribute lv: '1' | '2' | '3' | '4';

  get #lv() {
    return this.lv || '1';
  }

  @effect()
  #checkHash = () => {
    const { hash } = history.getParams();
    if (hash === `#${this.id}`) {
      this.scrollIntoView();
    }
  };

  render = () => {
    switch (this.#lv) {
      case '1':
        return html`<h1><slot></slot></h1>`;
      case '2':
        return html`<h2><slot></slot></h2>`;
      case '3':
        return html`<h3><slot></slot></h3>`;
      case '4':
        return html`<h4><slot></slot></h4>`;
    }
  };
}
