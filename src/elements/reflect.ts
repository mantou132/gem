import { GemElement, customElement, property } from '..';

/**
 * 将 `<gem-reflect>` 的子元素渲染到其他元素中
 *
 * !!! 不能动态添加和移除子元素；
 *
 * @customElement gem-reflect
 */
@customElement('gem-reflect')
export class Meta extends GemElement {
  @property target: HTMLElement = document.head;

  constructor() {
    super(false);
    this.hidden = true;
  }

  mounted() {
    this.effect(
      () => {
        console.warn('Changes `target` will not be re-rendered');
      },
      () => [this.target],
    );
    const childNodes = [...this.childNodes];
    this.target.append(...childNodes);
    return () => {
      childNodes.forEach((node) => node.remove());
    };
  }
}
