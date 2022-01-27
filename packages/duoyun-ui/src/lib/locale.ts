import { createStore, updateStore } from '@mantou/gem/lib/store';

import en from '../locales/en';

import { OrderlyPromisePool } from './utils';

export const locale = createStore({ ...en });

const op = new OrderlyPromisePool();

export const updateLocale = (l: Partial<typeof en> | Promise<{ default: Partial<typeof en> }>) => {
  if (l instanceof Promise) {
    op.add(l, (ll) => updateStore(locale, ll.default));
  } else {
    updateStore(locale, l);
  }
};
