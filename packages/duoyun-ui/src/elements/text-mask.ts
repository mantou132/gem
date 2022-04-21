import { adoptedStyle, customElement, property, attribute } from '@mantou/gem/lib/decorators';
import { GemElement, html, TemplateResult } from '@mantou/gem/lib/element';
import { createCSSSheet, css } from '@mantou/gem/lib/utils';

const style = createCSSSheet(css`
  span {
    user-select: none;
  }
`);

/**
 * @customElement dy-text-mask
 */
@customElement('dy-text-mask')
@adoptedStyle(style)
export class DyTextMaskElement extends GemElement {
  @attribute origin: string;
  @attribute placeholder: string;
  @property masks?: string[];

  get #placeholder() {
    return this.placeholder || 'x';
  }

  #masks: Map<number, [string[], (TemplateResult | string)[]]>;

  willMount = () => {
    this.memo(
      () => {
        const clearRegRxp = new RegExp(`[^${this.#placeholder}]`, 'g');
        const matchRegRxp = new RegExp(`([${this.#placeholder}]+)`);
        this.#masks = new Map();
        this.masks?.forEach((mask) => {
          const { length } = mask.replaceAll(clearRegRxp, '');
          const templateArr: string[] = [];
          const values: (TemplateResult | string)[] = [];
          mask.split(matchRegRxp).forEach((e) => {
            templateArr.push('');
            if (!e) {
              values.push('');
            } else if (e === this.#placeholder.repeat(e.length)) {
              values.push(e);
            } else {
              values.push(html`<span>${e}</span>`);
            }
          });
          templateArr.push('');
          this.#masks.set(length, [templateArr, values]);
        });
      },
      () => this.masks || [],
    );
  };

  render = () => {
    const arg = this.#masks.get(this.origin.length);
    if (!arg) return html`${this.origin}`;

    let index = 0;
    const values = arg[1].map((e) => {
      if (typeof e === 'string') {
        const s = this.origin.slice(index, index + e.length);
        index += e.length;
        return s;
      }
      return e;
    });
    return html(arg[0] as unknown as TemplateStringsArray, ...values);
  };
}
