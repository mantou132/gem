import { html, randomStr, GemElement, customElement, render, refobject, RefObject } from '../..';

import '../../elements/reflect';

import '../elements/layout';
@customElement('app-children')
export class AppChild extends GemElement {
  mounted = () => console.log('mounted');
}

@customElement('app-root')
export class App extends GemElement {
  @refobject childrenRef: RefObject<HTMLStyleElement>;
  state = {
    mount: true,
  };

  mounted() {
    document.addEventListener('click', this.update);
  }

  updated() {
    console.trace('updated', this.childrenRef.element);
  }

  render() {
    return html`
      <button @click=${() => this.setState({ mount: true })}>mount</button>
      <button @click=${() => this.setState({ mount: false })}>unmount</button>
      ${this.state.mount
        ? html`
            <gem-reflect>
              <app-children ref=${this.childrenRef.ref}></app-children>
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
