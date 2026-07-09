import { createStore } from '@mantou/gem/lib/store';

import en from '../locales/en';
import { OrderlyPromisePool } from './utils';

export const locale = createStore({ ...en });

const op = new OrderlyPromisePool();

export const loadLocale = (l: Promise<{ default: Partial<typeof en> }>) => {
  op.add(l, (ll) => locale(ll.default));
};
