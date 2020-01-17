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
} from '../../';

import { Message, Children } from './chidren';
import './chidren';

const store = createStore<{ msg: Message; now: Date }>({
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
class App extends GemElement {
  @refobject childRef: RefObject<Children>;
  @attribute appTitle: string;

  constructor(title: string) {
    super();
    this.appTitle = title;
  }

  onSayHi = () => {
    const [foo, bar] = store.msg;
    updateStore(store, {
      msg: [bar, foo],
      now: new Date(),
    });
  };

  loadHandle = () => {
    const { element } = this.childRef;
    console.log(element?.firstName, element?.lastName);
  };

  render() {
    return html`
      <style>
        app-children:state(odd)::part(paragraph) {
          color: red;
        }
      </style>
      <h1>${this.appTitle}</h1>
      <app-children
        ref=${this.childRef.ref}
        @load=${this.loadHandle}
        @sayhi=${this.onSayHi}
        .message=${store.msg}
        first-name="hello"
        last-name="world"
      >
        <p slot="light">now: ${store.now}</p>
      </app-children>
    `;
  }
}

document.body.append(new App(`I'm Title`));
