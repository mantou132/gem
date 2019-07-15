import { expect, aTimeout } from '@open-wc/testing';
import { createStore, createStoreSet, updateStore, connect, disconnect } from '..';

describe('store 测试', () => {
  it('create store', () => {
    const origin = { a: 1 };
    const store = createStore(origin);
    expect(store).to.equal(origin);
    const stores = createStoreSet({ a: origin });
    expect(stores.a).to.equal(origin);
  });
  it('update store', async () => {
    const store = createStore({ a: 1 });
    let flag = true;
    const update = () => (flag = !flag);
    connect(
      store,
      update,
    );
    updateStore(store, { a: 1 });
    await aTimeout();
    expect(flag).to.equal(false);
    disconnect(store, update);
    updateStore(store, { a: 1 });
    await aTimeout();
    expect(flag).to.equal(false);
  });
});
