import { adoptedStyle, attribute, css, customElement, GemElement, html, property, template } from '@mantou/gem';

export const span = (v: string) => html`<span>${v}</span>`;
export const spanTarget = (v: string) => html`<span class="target">${v}</span>`;
export const nestedStatic = (v: string) => html`<div><p class="p">${v}</p></div>`;
export const twoParts = (a: string, b: string) => html`<div>${a}<hr />${b}</div>`;
export const nested = (v: string) => html`<div>${html`<em>${v}</em>`}</div>`;
export const nestedTail = (v: string) => html`<div>${html`<b>${v} tail</b>`}</div>`;
export const condition = (v: boolean) => html`<div><p v-if=${v} style="color: red;">A</p><p v-else>B</p></div>`;
export const list = (items: string[]) => html`<ul>${items.map((i) => html`<li>${i}</li>`)}</ul>`;
export const button = (onClick?: () => void) => html`<button @click=${onClick}>${'btn'}</button>`;
export const restForm = (onsubmit?: () => void) =>
  html`<form ${{ method: 'post', action: '?/save', onsubmit }}>${'form'}</form>`;

@customElement('hydration-light')
export class HydrationLightElement extends GemElement {
  @attribute label = '';

  @template()
  #render = () => html`<span class="label">${this.label}</span>`;
}

export const lightElement = () => html`<hydration-light label="hi"></hydration-light>`;

// 元素是父元素中的最后一个元素，水合元素时不能遍历到后面的节点，例如父模版的结束标记
export const lightLast = (a: string, b: string) =>
  html`<div>${html`<main><hydration-light label="hi"></hydration-light></main>`}<footer>${a}<hr />${b}</footer></div>`;

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

@customElement('hydration-html')
export class HydrationHTMLElement extends GemElement {
  @property content = '';

  @template()
  #render = () => {
    if (this.innerHTML !== this.content) this.innerHTML = this.content;
    return undefined;
  };
}

// 原样输出的内容不能影响父模版的节点索引
export const htmlContent = (v: string) =>
  html`<hydration-html .content=${'<b>raw</b><i>html</i>'}></hydration-html><p>${v}</p>`;

export const rawText = (color: string, bg: string, v: string) =>
  html`<style>p{color:${color};background:${bg}}</style><p>${v}</p>`;

export const nullTemplate = (v: string) => html`<hydration-null></hydration-null><p>${v}</p>`;
