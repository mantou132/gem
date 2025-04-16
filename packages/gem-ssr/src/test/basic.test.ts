import '../lib/shim';

import test from 'node:test';

import {
  adoptedStyle,
  attribute,
  connectStore,
  createState,
  createStore,
  css,
  customElement,
  GemElement,
  html,
  mounted,
  property,
  shadow,
  template,
} from '@mantou/gem';

import { t } from './utils';

const style = css`
  :scope {
    font-size: medium;
  }
`;
const store = createStore({ count: 2 });

@customElement('app-light-demo')
@connectStore(store)
@adoptedStyle(style)
export class DemoLightElement extends GemElement {
  @attribute attr: string;
  @property prop?: any;

  #state = createState({ count: 1 });

  @mounted()
  #mounted = () => {
    throw new Error("should't exec");
  };

  @template()
  #render = () => {
    return html`
      light dom
      <div>attr: ${this.attr}</div>
      <div>prop: ${this.prop}</div>
      <div>state: ${this.#state.count}</div>
      <div>store: ${store.count}</div>
    `;
  };
}

test('basic light', async ({ assert: { snapshot } }) => {
  snapshot(await t(html`<app-light-demo attr="attr" .prop=${'prop'}></app-light-demo>`));
});

@customElement('app-shadow-demo')
@shadow()
export class DemoShadowElement extends GemElement {
  mounted = () => {
    throw new Error("should't exec");
  };

  render = () => {
    return html`shadow dom`;
  };
}

test('basic shadow', async ({ assert: { snapshot } }) => {
  snapshot(await t(html`<app-shadow-demo></app-shadow-demo>`));
});
