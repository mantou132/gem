import { createState, customElement, GemElement, html, template } from '@mantou/gem';

// `<app-*>` in templates is imported from `src/elements` automatically
@customElement('app-counter')
export class AppCounterElement extends GemElement {
  #state = createState({ count: 0 });

  #increase = () => this.#state({ count: this.#state.count + 1 });

  @template()
  #content = () => html`<button @click=${this.#increase}>Count: ${this.#state.count}</button>`;
}
