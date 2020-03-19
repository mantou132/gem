import { expect, aTimeout } from '@open-wc/testing';
import { HANDLES_KEY, createStore, createStoreSet, updateStore, connect, disconnect } from '..';

describe('store 测试', () => {
  it('create store', () => {
    const origin = { a: 1 };
    const store = createStore(origin);
    expect(store).to.equal(origin);
    expect(!!store[HANDLES_KEY]).to.equal(true);
    const stores = createStoreSet({ a: {} });
    expect(!!stores.a[HANDLES_KEY]).to.equal(true);
  });
  it('update store', async () => {
    const store = createStore({ a: 1 });
    let flag = true;
    const update = () => (flag = !flag);
    connect(store, update);
    updateStore(store, { a: 1 });
    await aTimeout(0);
    expect(flag).to.equal(false);
    disconnect(store, update);
    updateStore(store, { a: 1 });
    await aTimeout(0);
    expect(flag).to.equal(false);
  });
});
