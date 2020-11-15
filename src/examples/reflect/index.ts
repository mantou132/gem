import { html, randomStr, GemElement, customElement, render } from '../..';

import '../../elements/reflect';

import '../elements/layout';

@customElement('app-root')
export class App extends GemElement {
  state = {
    mount: true,
  };

  mounted() {
    document.addEventListener('click', this.update);
  }

  render() {
    return html`
      <button @click=${() => this.setState({ mount: true })}>mount</button>
      <button @click=${() => this.setState({ mount: false })}>unmount</button>
      ${this.state.mount
        ? html`
            <gem-reflect>
              <style>
                head {
                  display: block;
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
      <app-root slot="main"></app-root>
    </gem-examples-layout>
  `,
  document.body,
);
