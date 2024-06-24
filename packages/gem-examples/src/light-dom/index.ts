import { GemElement, customElement, html, render } from '@mantou/gem';

import '../elements/layout';

@customElement('app-root')
export class App extends GemElement {
  state = { now: 0 };
  constructor() {
    super({ isLight: true });
    setInterval(() => {
      this.setState({ now: Date.now() });
    }, 1000);
  }

  render() {
    return html`
      <div>hello world!</div>
      <time>${this.state.now}</time>
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
