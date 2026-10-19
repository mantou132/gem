import { attribute, customElement, GemElement, html, mounted, shadow, template } from '@mantou/gem';

/**
 * 把内容插入到页面的其他区域，例如 `sidebar-before`、`main-before`、`main-after`、`nav-inside`，
 * 没有 `slot` 时插入到 `<head>`，离开页面时移除
 *
 * 使用没有插槽的 Shadow DOM，子元素保留但不显示（默认模版是插槽）
 */
@customElement('gbp-content')
@shadow()
export class GbpContentElement extends GemElement {
  @attribute method: 'prepend' | 'append';

  @mounted()
  #insert = () => {
    const target = this.slot ? document.querySelector(`[data-gbp-slot="${this.slot}"]`) : document.head;
    const nodes = [...this.childNodes].map((node) => node.cloneNode(true) as ChildNode);
    if (this.method === 'prepend') target?.prepend(...nodes);
    else target?.append(...nodes);
    return () => nodes.forEach((node) => node.remove());
  };

  @template()
  #content = () => html``;
}
