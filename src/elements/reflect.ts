import { GemElement, customElement, property } from '..';

// support prerender
document.querySelectorAll('[data-reflect]').forEach((e) => e.remove());

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
        childNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            node.dataset.reflect = '';
          }
          this.target.append(node);
        });
        return () => {
          childNodes.forEach((node) => node.remove());
        };
      },
      () => [this.target],
    );
  }
}
