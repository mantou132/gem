import { adoptedStyle, customElement, attribute, boolattribute, numattribute } from '@mantou/gem/lib/decorators';
import { html } from '@mantou/gem/lib/element';
import { createCSSSheet, css, styleMap } from '@mantou/gem/lib/utils';

import { theme } from '../lib/theme';

import { DuoyunVisibleBaseElement } from './base/visible';

const style = createCSSSheet(css`
  :host {
    display: block;
    flex-grow: 1;
  }
  :host(:not([mode='multi'])) {
    display: flex;
    align-content: center;
  }
  :host([center]) {
    justify-content: center;
  }
  .content {
    background-image: linear-gradient(${theme.lightBackgroundColor}, ${theme.lightBackgroundColor});
    background-position-y: center;
    background-size: 100% 1em;
    background-repeat: no-repeat;
  }
`);

/**
 * @customElement dy-placeholder
 * @attr mode
 * @attr width
 * @attr center
 * @attr max-line
 * @attr min-line
 */
@customElement('dy-placeholder')
@adoptedStyle(style)
export class DuoyunPlaceholderElement extends DuoyunVisibleBaseElement {
  @attribute mode: 'single' | 'multi';
  @boolattribute center: boolean; // mode: 'single'
  /**
   * %
   */
  @attribute width: string;
  @numattribute maxLine: number;
  @numattribute minLine: number;

  get #mode() {
    return this.mode || 'single';
  }

  get #maxLine() {
    return this.maxLine || 3;
  }

  get #minLine() {
    return this.minLine || 1;
  }

  constructor() {
    super();
    this.internals.role = 'progressbar';
    this.internals.ariaBusy = 'true';
  }

  render = () => {
    const lineCount =
      this.#mode === 'single' ? 1 : Math.round(this.#minLine + Math.random() * (this.#maxLine - this.#minLine));
    return html`${Array(lineCount)
      .fill(null)
      .map(
        (_, index) =>
          html`
            <div
              class="content"
              style=${styleMap({
                width: index === lineCount - 1 ? this.width || `${50 + Math.random() * 50}%` : 'auto',
              })}
            >
              &ZeroWidthSpace;
            </div>
          `,
      )}`;
  };
}