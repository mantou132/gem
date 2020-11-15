import { GemElement, html, customElement, RefObject, refobject, render } from '../../';

import '../elements/layout';

// https://github.com/Microsoft/TypeScript/issues/28502
declare let ResizeObserver: any;

type State = { height: number };
function effect([element, textareaElement]: [GemElement<State>, HTMLTextAreaElement | null]) {
  if (!textareaElement) return element.setState({ height: 0 });
  const ro = new ResizeObserver(([entry]: [any]) => {
    element.setState({ height: entry.contentRect.height });
  });
  ro.observe(textareaElement, {});
  return () => ro.disconnect();
}

@customElement('app-root')
export class App extends GemElement<State & { hidden: boolean }> {
  @refobject textAreaRef: RefObject<HTMLTextAreaElement>;
  state = {
    height: 0,
    hidden: false,
  };

  render() {
    return html`
      <div><button @click=${() => this.setState({ hidden: !this.state.hidden })}>switch</button></div>
      ${this.state.hidden ? null : html`<textarea ref=${this.textAreaRef.ref}></textarea>`}
      <div>${this.state.height}</div>
    `;
  }
  mounted() {
    this.effect(effect, () => [this, this.textAreaRef.element]);
  }
}

render(
  html`
    <gem-examples-layout>
      <app-root slot="main"></app-root>
    </gem-examples-layout>
  `,
  document.body,
);
