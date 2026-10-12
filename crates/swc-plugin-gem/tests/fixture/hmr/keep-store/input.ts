// @ts-nocheck
import { createStore } from '@mantou/gem';

export const store = createStore({ a: 1 });
const other = 1,
  store2 = createStore({ b: 1 });
const local = createLocalStore();

@customElement('my-element')
@connectStore(store)
export class MyElement extends GemElement {}
