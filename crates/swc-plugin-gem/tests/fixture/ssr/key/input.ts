// @ts-nocheck
import { createDecoratorTheme, createScopedTheme, createStore, createTheme } from '@mantou/gem';

export const store = createStore({ a: 1 });
const other = 1,
  store2 = createStore({ b: 1 });
const keyed = createStore({ c: 1 }, 'custom');
const aliased = gem.createStore({ d: 1 });

function create() {
  const local = createStore({ e: 1 });
  return local;
}

export const theme = createTheme({ color: 'red' });
const scopedTheme = createScopedTheme({ color: 'red' });
const elementTheme = createDecoratorTheme({ color: 'red' });
const keyedTheme = createTheme({ color: 'red' }, 'custom');
