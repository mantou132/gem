import { html, randomStr, GemElement, customElement, render, createState, mounted } from '@mantou/gem';

import '@mantou/gem/elements/reflect';

import '../elements/layout';

@customElement('app-children')
export class AppChild extends GemElement {
  @mounted()
  #init = () => console.log('mounted');
}

@customElement('app-root')
export class App extends GemElement {
  #state = createState({ mount: true });

  @mounted()
  #init() {
    document.addEventListener('click', this.update);
  }

  render() {
    return html`
      <button @click=${() => this.#state({ mount: true })}>mount</button>
      <button @click=${() => this.#state({ mount: false })}>unmount</button>
      ${this.#state.mount
        ? html`
            <gem-reflect>
              <app-children></app-children>
              <style>
                head {
                  display: block;
                  position: absolute;
                  top: 0;
                  left: 50%;
                }
                head::before {
                  content: '<head>';
                }
                head::after {
                  content: '</head>';
                }
              </style>
              <div>${randomStr()}</div>
              <div>${randomStr()}</div>
            </gem-reflect>
          `
        : null}
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
