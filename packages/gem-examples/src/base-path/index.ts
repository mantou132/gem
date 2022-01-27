import { GemElement, html, history, render, customElement } from '@mantou/gem';
import '@mantou/gem/elements/link';

import '../elements/layout';

@customElement('app-root')
export class App extends GemElement {
  state = {
    count: 5,
  };
  constructor() {
    super();
    this.onclick = () => {
      this.setState({ count: this.state.count - 1 });
      if (!this.state.count) {
        history.basePath = '/base-path';
      }
    };
  }
  render() {
    return html`
      <main>
        ${this.state.count > 0
          ? html`<div>${this.state.count} 次后将改变 \`basePath\`</div>`
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
      <app-root slot="main"></app-root>
    </gem-examples-layout>
  `,
  document.body,
);
