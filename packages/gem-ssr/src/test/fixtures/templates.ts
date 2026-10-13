import { adoptedStyle, attribute, css, customElement, GemElement, html, template } from '@mantou/gem';

export const span = (v: string) => html`<span>${v}</span>`;
export const spanTarget = (v: string) => html`<span class="target">${v}</span>`;
export const nestedStatic = (v: string) => html`<div><p class="p">${v}</p></div>`;
export const twoParts = (a: string, b: string) => html`<div>${a}<hr />${b}</div>`;
export const nested = (v: string) => html`<div>${html`<em>${v}</em>`}</div>`;
export const nestedTail = (v: string) => html`<div>${html`<b>${v} tail</b>`}</div>`;
export const condition = (v: boolean) => html`<div><p v-if=${v} style="color: red;">A</p><p v-else>B</p></div>`;
export const list = (items: string[]) => html`<ul>${items.map((i) => html`<li>${i}</li>`)}</ul>`;
export const button = (onClick?: () => void) => html`<button @click=${onClick}>${'btn'}</button>`;

@customElement('hydration-light')
export class HydrationLightElement extends GemElement {
  @attribute label = '';

  @template()
  #render = () => html`<span class="label">${this.label}</span>`;
}

export const lightElement = () => html`<hydration-light label="hi"></hydration-light>`;

const style = css`
  :scope {
    color: red;
  }
`;

@customElement('hydration-styled')
@adoptedStyle(style)
export class HydrationStyledElement extends GemElement {}

// 没有模板的元素中输出的样式不能影响父模板的节点索引
export const styledChild = (a: string, b: string) =>
  html`<div><hydration-styled><i>${a}</i></hydration-styled><b>${b}</b></div>`;

@customElement('hydration-null')
export class HydrationNullElement extends GemElement {
  @template()
  #render = () => null;
}

export const nullTemplate = (v: string) => html`<hydration-null></hydration-null><p>${v}</p>`;
