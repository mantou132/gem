import { aTimeout, expect } from '@mantou/gem/test/utils';

import { Cache } from './cache';

it('`Cache` LRU', () => {
  const cache = new Cache({ max: 50 });
  Array.from({ length: 50 }, (_, index) => cache.set(String(index), String(index)));
  cache.set('51', '51');
  expect(cache.get('0')).to.equal(undefined);
  expect(cache.get('1')).to.equal('1');
  cache.set('52', '52');
  expect(cache.get('1')).to.equal('1');
});

it('`Cache` maxAge', async () => {
  const cache = new Cache({ maxAge: 10 });
  cache.set('1', '1');
  expect(cache.get('1')).to.equal('1');
  await aTimeout(11);
  expect(cache.get('1')).to.equal(undefined);
});
