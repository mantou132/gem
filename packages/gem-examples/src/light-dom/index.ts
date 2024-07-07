import { GemElement, customElement, html, render, shadow } from '@mantou/gem';

import '../elements/layout';

@customElement('app-root')
@shadow({ mode: null })
export class App extends GemElement {
  state = { now: 0 };
  constructor() {
    super();
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
