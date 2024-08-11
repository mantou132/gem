import { GemElement, html, history, render, customElement, createState, mounted, addListener } from '@mantou/gem';
import '@mantou/gem/elements/link';

import '../elements/layout';

@customElement('app-root')
export class App extends GemElement {
  #state = createState({
    count: 5,
  });

  @mounted()
  #init = () =>
    addListener(this, 'click', () => {
      this.#state({ count: this.#state.count - 1 });
      if (!this.#state.count) {
        history.basePath = '/base-path';
      }
    });

  render() {
    return html`
      <main>
        ${this.#state.count > 0
          ? html`<div>${this.#state.count} 次后将改变 \`basePath\`</div>`
          : html`<div>\`basePath\` 为 ${history.basePath}</div>`}
        <gem-link href="/a">href="/a"</gem-link>
        <button @click=${() => history.push({ path: '/b' })}>push({ path: '/b' })</button>
        <button @click=${() => history.push({ hash: '#b' })}>push({ hash: '#b' })</button>
        <button @click=${() => history.pushIgnoreCloseHandle({ path: '/c' })}>
          push({ pushIgnoreCloseHandle: '/c' })
        </button>
      </main>
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
