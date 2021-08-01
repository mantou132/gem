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
    this.effect(
      () => {
        const childNodes = [...this.childNodes];
        this.target.append(...childNodes);
        return () => {
          childNodes.forEach((node) => node.remove());
        };
      },
      () => [this.target],
    );
  }
}
