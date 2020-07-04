import { GemElement, attribute, customElement } from '../';

/**
 * @customElement gem-unsafe
 * @attr content
 */
@customElement('gem-unsafe')
export class Use extends GemElement {
  @attribute content = '';

  constructor() {
    super();
    this.effect(
      () => {
        if (this.shadowRoot) {
          this.shadowRoot.innerHTML = `
            <style>:host {display: contents}</style>
            ${this.content}
          `;
        }
      },
      () => [this.content],
    );
  }

  render() {
    return undefined;
  }
}
