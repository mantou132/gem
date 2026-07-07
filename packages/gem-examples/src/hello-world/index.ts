import { render } from '@mantou/gem';

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

  @template()
  #render = () => {
    return html`
      <button @click=${this.#clickHandle}>Hello, World</button>
      <div>store.a: ${store.a}</div>
    `;
  };
}

render(
  html`
    <gem-examples-layout>
      <app-root></app-root>
    </gem-examples-layout>
  `,
  document.body,
);
