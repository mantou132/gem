import { _StoreListenerMap, connect, createStore } from '../lib/store';
import { aTimeout, expect } from './utils';

describe('store 测试', () => {
  it('create store', () => {
    const origin = { a: 1 };
    const store = createStore(origin);
    expect({ ...store }).to.deep.equal(origin);
    expect(!!_StoreListenerMap.get(store)).to.equal(true);
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

describe('store `name` `length` 字段', () => {
  it('create and update store', () => {
    const store = createStore({ name: 'guest', length: 1 });
    expect({ ...store }).to.deep.equal({ name: 'guest', length: 1 });
    store({ name: 'admin', length: 2 });
    expect({ ...store }).to.deep.equal({ name: 'admin', length: 2 });
    const store2 = createStore<{ name?: string }>({});
    store2({ name: 'guest' });
    expect(store2.name).to.equal('guest');
  });
});
