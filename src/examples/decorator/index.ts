import {
  createStore,
  updateStore,
  createCSSSheet,
  GemElement,
  html,
  attribute,
  connectStore,
  customElement,
} from '../../';
import { Message } from './chidren';
import './chidren';
import { css } from '../../lib/utils';
import { adoptedStyle } from '../../lib/decorators';

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
  constructor(title: string) {
    super();
    this.appTitle = title;
  }

  @attribute appTitle: string;

  onSayHi = () => {
    const [foo, bar] = store.msg;
    updateStore(store, {
      msg: [bar, foo],
      now: new Date(),
    });
  };

  render() {
    return html`
      <h1>${this.appTitle}</h1>
      <app-children @say-hi=${this.onSayHi} .message=${store.msg} first-name="hello" last-name="world">
        <p slot="light">now: ${store.now}</p>
      </app-children>
    `;
  }
}

document.body.append(new App(`I'm Title`));
