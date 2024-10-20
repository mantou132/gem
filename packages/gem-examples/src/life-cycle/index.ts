import {
  createCSSSheet,
  GemElement,
  html,
  createRef,
  attribute,
  connectStore,
  customElement,
  adoptedStyle,
  css,
  render,
  createStore,
  mounted,
  fallback,
} from '@mantou/gem';

import '../elements/layout';

import type { Message } from './children';
import { Children } from './children';

interface GlobalState {
  msg: Message;
  now: Date;
}

const store = createStore<GlobalState>({
  msg: [1, 2],
  now: new Date(),
});

const styles = createCSSSheet(css`
  h1 {
    text-decoration: underline;
  }
`);

@connectStore(store)
@adoptedStyle(styles)
@customElement('app-root')
export class App extends GemElement {
  @attribute appTitle: string;

  #childRef = createRef<Children>();

  constructor(title: string) {
    super();
    this.appTitle = title;
    console.log('parent cons');
  }

  @mounted()
  #init = () => {
    console.log('parent mounted');
  };

  onSayHi = () => {
    const [foo, bar] = store.msg;
    store({
      msg: [bar, foo],
      now: new Date(),
    });
  };

  loadHandle = () => {
    const { value: element } = this.#childRef;
    if (!element) return;
    const { firstName, lastName, disabled, count } = element;
    console.log({ firstName, lastName, disabled, count });
  };

  @fallback()
  #error = (detail?: Error) => {
    console.error(detail);
    return html`${detail?.message}`;
  };

  render() {
    console.log('parent render');
    return html`
      <style>
        app-children:state(odd)::part(${Children.paragraph}) {
          color: red;
        }
      </style>
      <h1>${this.appTitle}</h1>
      <app-children
        ${this.#childRef}
        @load=${this.loadHandle}
        @say-hi=${this.onSayHi}
        .message=${store.msg}
        first-name="hello"
        last-name="world"
        count=${1}
        disabled
      >
        <p slot=${Children.light}>now: ${store.now}</p>
      </app-children>
    `;
  }
}

document.addEventListener('say-hi', (e: CustomEvent) => {
  console.log('`sayhi` target', e.composedPath()[0]);
});

render(
  html`
    <gem-examples-layout>
      <app-root app-title="I'm Title"></app-root>
    </gem-examples-layout>
  `,
  document.body,
);
