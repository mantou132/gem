import { expect } from '@mantou/gem/test/utils';

import { once, omitOnce } from './timer';

it('`once`', () => {
  let count = 1;
  const fn = () => count++;
  const onceFn = once(fn);
  onceFn();
  expect(count).to.equal(2);
  onceFn();
  expect(count).to.equal(2);
});

it('`omitOnce`', () => {
  let count = 1;
  const fn = () => count++;
  const omitOnceFn = omitOnce(fn);
  omitOnceFn();
  expect(count).to.equal(1);
  omitOnceFn();
  omitOnceFn();
  expect(count).to.equal(3);
});
