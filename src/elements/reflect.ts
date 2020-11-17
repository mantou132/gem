import { GemElement, customElement, property } from '..';

/**
 * 将 `<gem-reflect>` 的子元素渲染到其他元素中
 *
 * @customElement gem-reflect
 */
@customElement('gem-reflect')
export class GemReflectElement extends GemElement {
  @property target: HTMLElement = document.head;

  constructor() {
    super({ isLight: true });
    this.hidden = true;
  }

  mounted() {
    const childNodes = [...this.childNodes];
    this.effect(
      () => this.target.append(...childNodes),
      () => [this.target],
    );
    return () => {
      childNodes.forEach((node) => node.remove());
    };
  }
}
