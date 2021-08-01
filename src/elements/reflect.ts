import { GemElement, customElement, property } from '..';

/**
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
