import { customElement, GemElement, html, property, template } from '@mantou/gem';

export const renders: string[] = [];

// 子元素先定义，水合时会在父元素之前升级（jsdom 不支持声明式 ShadowDOM，使用 light DOM）
@customElement('app-props-child')
export class DemoPropsChildElement extends GemElement {
  @property item?: { name: string };

  @template()
  #render = () => {
    renders.push(this.item?.name ?? '');
    if (!this.item) return html`<i>empty</i>`;
    return html`<b>${this.item.name}</b>`;
  };
}

@customElement('app-props-parent')
export class DemoPropsParentElement extends GemElement {
  @template()
  #render = () => html`<app-props-child .item=${{ name: 'a' }}></app-props-child>`;
}

export const props = () => html`<app-props-parent></app-props-parent>`;
