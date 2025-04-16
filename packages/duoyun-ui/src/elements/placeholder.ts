import { createDecoratorTheme } from '@mantou/gem/helper/theme';
import {
  adoptedStyle,
  aria,
  attribute,
  boolattribute,
  customElement,
  numattribute,
  part,
  shadow,
} from '@mantou/gem/lib/decorators';
import { css, html } from '@mantou/gem/lib/element';
import { styleMap } from '@mantou/gem/lib/utils';

import { theme } from '../lib/theme';
import { DuoyunVisibleBaseElement } from './base/visible';

const elementTheme = createDecoratorTheme({ color: '' });

const style = css`
  :host(:where(:not([hidden]))) {
    display: block;
    flex-grow: 1;
  }
  :host(:where(:not([hidden], [type='multi'], [mode='multi']))) {
    display: flex;
    align-content: center;
  }
  :host([center]) {
    justify-content: center;
  }
  .content {
    background-image: linear-gradient(${elementTheme.color}, ${elementTheme.color});
    background-position-y: center;
    background-size: 100% 1em;
    background-repeat: no-repeat;
  }
`;

@customElement('dy-placeholder')
@adoptedStyle(style)
@aria({ role: 'progressbar', ariaBusy: 'true' })
@shadow()
export class DuoyunPlaceholderElement extends DuoyunVisibleBaseElement {
  @part static line: string;

  /**@deprecated */
  @attribute mode: 'single' | 'multi';
  @attribute type: 'single' | 'multi';
  @boolattribute center: boolean; // only type 'single'
  /**% */
  @attribute width: string;
  @attribute color: string;
  @numattribute maxLine: number;
  @numattribute minLine: number;

  get #type() {
    return this.type || this.mode || 'single';
  }

  get #maxLine() {
    return this.maxLine || 3;
  }

  get #minLine() {
    return this.minLine || 1;
  }

  @elementTheme()
  #theme = () => ({ color: this.color || theme.lightBackgroundColor });

  render = () => {
    const lineCount =
      this.#type === 'single' ? 1 : Math.round(this.#minLine + Math.random() * (this.#maxLine - this.#minLine));
    return html`
      ${Array(lineCount)
        .fill(null)
        .map(
          (_, index) => html`
            <div
              class="content"
              part=${DuoyunPlaceholderElement.line}
              style=${styleMap({
                width: index === lineCount - 1 ? this.width || `${50 + Math.random() * 50}%` : 'auto',
              })}
            >
              &ZeroWidthSpace;
            </div>
          `,
        )}
    `;
  };
}
