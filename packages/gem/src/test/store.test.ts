import { expect, aTimeout } from '@open-wc/testing';

import { StoreListenerMap, createStore, createStoreSet, updateStore, connect, disconnect } from '../lib/store';

describe('store 测试', () => {
  it('create store', () => {
    const origin = { a: 1 };
    const store = createStore(origin);
    expect(store).to.equal(origin);
    expect(!!StoreListenerMap.get(store)).to.equal(true);
    const stores = createStoreSet({ a: {} });
    expect(!!StoreListenerMap.get(stores.a)).to.equal(true);
  });
  it('update store', async () => {
    const store = createStore({ a: 1 });
    let flag = true;
    const update = () => (flag = !flag);
    connect(store, update);
    updateStore(store, { a: 1 });
    await aTimeout(0);
    expect(flag).to.equal(false);
    updateStore(store);
    await aTimeout(0);
    expect(flag).to.equal(true);
    disconnect(store, update);
    updateStore(store, { a: 1 });
    await aTimeout(0);
    expect(flag).to.equal(true);
  });
});
