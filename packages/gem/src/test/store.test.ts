import { expect, aTimeout } from '@open-wc/testing';

import { StoreListenerMap, createStore, connect } from '../lib/store';

describe('store 测试', () => {
  it('create store', () => {
    const origin = { a: 1 };
    const store = createStore(origin);
    expect({ ...store }).to.deep.equal(origin);
    expect(!!StoreListenerMap.get(store)).to.equal(true);
  });
  it('update store', async () => {
    const store = createStore({ a: 1 });
    let flag = true;
    const update = () => (flag = !flag);
    const disconnect = connect(store, update);
    store({ a: 1 });
    await aTimeout(0);
    expect(flag).to.equal(false);
    store();
    await aTimeout(0);
    expect(flag).to.equal(true);
    disconnect();
    store({ a: 1 });
    await aTimeout(0);
    expect(flag).to.equal(true);
  });
});
