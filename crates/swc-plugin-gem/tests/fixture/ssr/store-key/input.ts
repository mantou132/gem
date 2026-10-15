// @ts-nocheck
import { createStore } from '@mantou/gem';

export const store = createStore({ a: 1 });
const other = 1,
  store2 = createStore({ b: 1 });
const keyed = createStore({ c: 1 }, 'custom');
const aliased = gem.createStore({ d: 1 });

function create() {
  const local = createStore({ e: 1 });
  return local;
}
