import { adoptedStyle, customElement, property, attribute, shadow } from '@mantou/gem/lib/decorators';
import { GemElement, html, TemplateResult } from '@mantou/gem/lib/element';
import { createCSSSheet, css } from '@mantou/gem/lib/utils';

const style = createCSSSheet(css`
  span {
    user-select: none;
  }
`);

// other | placeholder | replacer
type MaskParseValue = TemplateResult | string | number;

/**
 * @customElement dy-text-mask
 */
@customElement('dy-text-mask')
@adoptedStyle(style)
@shadow()
export class DuoyunTextMaskElement extends GemElement {
  @attribute origin: string;
  @attribute placeholder: string;
  @attribute replacer: string;
  @property masks?: string[];

  get #placeholder() {
    return this.placeholder || 'x';
  }

  get #replacer() {
    return this.replacer || '*';
  }

  constructor() {
    super();
    new MutationObserver(() => this.update()).observe(this, { childList: true, characterData: true, subtree: true });
  }

  #masks: Map<number, [string[], MaskParseValue[]]>;

  willMount = () => {
    this.memo(
      () => {
        const clearRegRxp = new RegExp(`[^${this.#placeholder}${this.#replacer}]`, 'g');
        const matchRegRxp = new RegExp(`([${this.#placeholder}]+|[${this.#replacer}]+)`);
        this.#masks = new Map();
        this.masks?.forEach((mask) => {
          const { length } = mask.replaceAll(clearRegRxp, '');
          const templateArr: string[] = [];
          const values: MaskParseValue[] = [];
          mask.split(matchRegRxp).forEach((e) => {
            templateArr.push('');
            if (!e) {
              values.push('');
            } else if (e === this.#placeholder.repeat(e.length)) {
              values.push(e);
            } else if (e === this.#replacer.repeat(e.length)) {
              values.push(e.length);
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
    const origin = this.origin || this.textContent?.trim() || '';
    const arg = this.#masks.get(origin.length);
    if (!arg) return html`${origin}`;

    let index = 0;
    const values = arg[1].map((e) => {
      switch (typeof e) {
        case 'string': {
          const s = origin.slice(index, index + e.length);
          index += e.length;
          return s;
        }
        case 'number': {
          index += e;
          return this.#replacer.repeat(e);
        }
        default:
          return e;
      }
    });
    return html(arg[0] as unknown as TemplateStringsArray, ...values);
  };
}
