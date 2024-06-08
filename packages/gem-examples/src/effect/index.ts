import { GemElement, html, customElement, RefObject, refobject, render } from '@mantou/gem';

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
  @refobject textAreaRef: RefObject<HTMLTextAreaElement>;
  state = {
    height: 0,
    hidden: false,
  };

  #updateHeight = (height: number) => {
    this.setState({ height });
  };

  render() {
    return html`
      <div><button @click=${() => this.setState({ hidden: !this.state.hidden })}>switch</button></div>
      ${this.state.hidden ? null : html`<textarea ref=${this.textAreaRef.ref}></textarea>`}
      <div>${this.state.height}</div>
    `;
  }
  mounted() {
    this.effect(effect, () => [this.textAreaRef.element, this.#updateHeight]);
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
