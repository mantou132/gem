import { expect } from '@open-wc/testing';

import {
  getCascaderDeep,
  getCascaderBubbleWeakMap,
  readProp,
  once,
  omitOnce,
  comparer,
  ComparerType,
  isIncludesString,
} from './utils';

it('`getCascaderDeep`', () => {
  expect(getCascaderDeep([{ a: 1, children: undefined }], 'children')).to.equal(1);
  expect(getCascaderDeep([{ a: 1, children: [{ a: 2 }] }], 'children')).to.equal(2);
});

it('`getCascaderBubbleWeakMap`', () => {
  type T = { a: number; children?: T[] };
  const data: T[] = [
    { a: 0, children: [{ a: 0 }] },
    { a: 1, children: [{ a: 0 }] },
    { a: 1, children: [{ a: 2, children: [{ a: 3 }] }] },
  ];
  const map = getCascaderBubbleWeakMap(
    data,
    'children',
    (e) => e.a,
    (a, b) => (a > b ? a : b),
  );
  expect(map.get(data[0])).to.equal(0);
  expect(map.get(data[1])).to.equal(1);
  expect(map.get(data[2])).to.equal(3);
});

it('`readProp`', () => {
  expect(readProp({ a: { b: { c: 1 } } }, ['a', 'b', 'c'])).to.equal(1);
  expect(readProp({ a: { b: { c: 1 } } }, ['a', 'b', 'c', 'd', 'e'])).to.equal(undefined);
  expect(readProp({ a: { b: { c: 1 } } }, ['f'])).to.equal(undefined);
});

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

it('`comparer`', () => {
  expect(comparer(1, ComparerType.Lte, 2)).to.equal(true);
  expect(comparer('11', ComparerType.Lte, '2')).to.equal(false);
  expect(comparer(11, ComparerType.Lte, '2')).to.equal(false);
  expect(comparer(1, ComparerType.Gte, 1)).to.equal(true);
  expect(comparer(1, ComparerType.Gte, '2')).to.equal(false);
  expect(comparer([1, 2], ComparerType.Have, 1)).to.equal(true);
  expect(comparer([1, 2], ComparerType.Have, '1')).to.equal(false);
  expect(comparer('12', ComparerType.Have, '1')).to.equal(true);
});

it('`isIncludesString`', () => {
  expect(isIncludesString('a.b.c.d', 'a.b')).to.equal(true);
  expect(isIncludesString('a.b.c.d', 'ab')).to.equal(false);
  expect(isIncludesString('a.b.c.d', 'e a')).to.equal(true);
  expect(isIncludesString('a.b.c.d', 'e/a')).to.equal(true);
});
