import { render, GemElement, html, createStore } from '@mantou/gem';
import { connectStore, customElement } from '@mantou/gem/lib/decorators';

import '../elements/layout';

// 新建全局数据对象
const store = createStore({
  a: 1,
});

// 定义自定义元素
@customElement('app-root')
@connectStore(store)
export class HelloWorld extends GemElement {
  #clickHandle = () => {
    store({ a: ++store.a });
  };

  render() {
    return html`
      <button @click="${this.#clickHandle}">Hello, World</button>
      <div>store.a: ${store.a}</div>
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
