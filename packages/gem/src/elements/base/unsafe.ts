import { adoptedStyle, attribute, effect, property, shadow, template } from '../../lib/decorators';
import type { Sheet } from '../../lib/reactive';
import { css, GemElement, SheetToken } from '../../lib/reactive';

const style = css`
  :host(:where(:not([hidden]))) {
    display: contents;
  }
`;

@shadow()
@adoptedStyle(style)
export class GemUnsafeElement extends GemElement {
  @attribute html: string;
  @property styles?: string | Sheet<any> | Sheet<any>[];

  get #sheets() {
    if (!this.styles) return [];
    if (typeof this.styles === 'string') {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(this.styles);
      return [sheet];
    } else {
      return [this.styles].flat().map((e) => e[SheetToken].getStyle());
    }
  }

  @effect()
  #adoptStyles = () => {
    const sheets = this.shadowRoot!.adoptedStyleSheets;
    this.shadowRoot!.adoptedStyleSheets = sheets.concat(this.#sheets);
    return () => {
      this.shadowRoot!.adoptedStyleSheets = sheets;
    };
  };

  @template()
  #content = () => {
    this.shadowRoot!.innerHTML = this.html;

    // 不要更新内容
    return undefined;
  };
}
