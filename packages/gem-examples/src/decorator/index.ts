import {
  createStore,
  updateStore,
  createCSSSheet,
  GemElement,
  html,
  refobject,
  RefObject,
  attribute,
  connectStore,
  customElement,
  adoptedStyle,
  css,
  render,
} from '@mantou/gem';

import '../elements/layout';

import { Message, Children } from './chidren';

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
  @refobject childRef: RefObject<Children>;
  @attribute appTitle: string;

  constructor(title: string) {
    super();
    this.appTitle = title;
    console.log('parent cons');
  }

  mounted = () => {
    console.log('parent mounted');
  };

  updated = () => {
    console.log('parent updated');
  };

  onSayHi = () => {
    const [foo, bar] = store.msg;
    updateStore(store, {
      msg: [bar, foo],
      now: new Date(),
    });
  };

  loadHandle = () => {
    const { element } = this.childRef;
    if (!element) return;
    const { firstName, lastName, disabled, count } = element;
    console.log({ firstName, lastName, disabled, count });
  };

  render() {
    console.log('parent render');
    return html`
      <style>
        app-children:where([data-odd], :state(odd))::part(${Children.paragraph}) {
          color: red;
        }
      </style>
      <h1>${this.appTitle}</h1>
      <app-children
        ref=${this.childRef.ref}
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
      <app-root app-title="I'm Title" slot="main"></app-root>
    </gem-examples-layout>
  `,
  document.body,
);
