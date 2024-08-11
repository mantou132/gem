import { GemElement, async, createState, customElement, html, numattribute, render } from '@mantou/gem';

import '../elements/layout';

@customElement('app-post')
@async()
export class Post extends GemElement {
  @numattribute index: number;

  render() {
    console.log(`render ${this.index}`);

    const startTime = performance.now();
    while (performance.now() - startTime < 2) {
      // Do nothing for 1 ms per item to emulate extremely slow code
    }
    return html`<div>Post #${this.index + 1}</div>`;
  }
}

@customElement('app-posts-page')
export class Posts extends GemElement {
  render() {
    return html`${Array.from({ length: 500 }, (_, i) => i).map((e) => html`<app-post .index=${e}></app-post>`)}`;
  }
}

@customElement('app-root')
export class App extends GemElement {
  #state = createState({
    tab: 'home',
  });

  #renderContent() {
    switch (this.#state.tab) {
      case 'posts':
        return html`<app-posts-page></app-posts-page>`;
      case 'about':
        return html`This is about tab`;
      default:
        return html`Welcome to my profile!`;
    }
  }

  render() {
    return html`
      <div>
        ${['home', 'posts', 'about'].map((tab) => {
          return html`<button ?disabled=${tab === this.#state.tab} @click=${() => this.#state({ tab })}>
            ${tab}
          </button> `;
        })}
      </div>
      <hr />
      ${this.#renderContent()}
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
