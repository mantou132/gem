import { GemElement } from '../../lib/element';
import { property } from '../../lib/decorators';

// support prerender
document.querySelectorAll('[data-reflect]').forEach((e) => e.remove());

export class GemReflectElement extends GemElement {
  @property target: HTMLElement = document.head;

  constructor() {
    super({ isLight: true });
    this.hidden = true;
    this.dataset.gemreflect = '';
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
