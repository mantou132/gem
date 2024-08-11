import { GemElement, html, customElement, render, createState, mounted, createRef } from '@mantou/gem';

import '../elements/layout';

function effect([textareaElement, callback]: [HTMLTextAreaElement | undefined, (height: number) => void]) {
  if (!textareaElement) return callback(0);
  const ro = new ResizeObserver(([entry]: [any]) => {
    callback(entry.contentRect.height);
  });
  ro.observe(textareaElement, {});
  return () => ro.disconnect();
}

@customElement('app-root')
export class App extends GemElement {
  #textAreaRef = createRef<HTMLTextAreaElement>();

  #state = createState({
    height: 0,
    hidden: false,
  });

  #updateHeight = (height: number) => {
    this.#state({ height });
  };

  @mounted()
  #init = () => {
    this.effect(effect, () => [this.#textAreaRef.element, this.#updateHeight]);
  };

  render() {
    return html`
      <div><button @click=${() => this.#state({ hidden: !this.#state.hidden })}>switch</button></div>
      ${this.#state.hidden ? null : html`<textarea ref=${this.#textAreaRef.ref}></textarea>`}
      <div>${this.#state.height}</div>
    `;
  }
}

render(
  html`
    <gem-examples-layout>
      <app-root></app-root>
    </gem-examples-layout>
  `,
  document.body,
);
