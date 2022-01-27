import { expect, aTimeout } from '@open-wc/testing';

import { history } from '../lib/history';

describe('history 测试', () => {
  it('hash', async () => {
    const historyLength = window.history.length;
    const hash = window.location.hash;
    history.push({ path: '/a', hash: '#a' });
    await aTimeout(10);
    expect(window.location.hash).to.equal('#a');
    history.back();
    await aTimeout(10);
    expect(window.location.hash).to.equal(hash);
    history.push({ path: '/a', hash: '#b' });
    await aTimeout(10);
    expect(window.location.hash).to.equal('#b');
    expect(window.history.length - historyLength).to.equal(1);
    history.push({ hash: '#标题' });
    await aTimeout(10);
    expect(window.location.pathname).to.equal('/a');
    expect(decodeURIComponent(window.location.hash)).to.equal('#标题');
    expect(history.getParams().hash).to.equal('#标题');
  });
  it('push/replace', async () => {
    const historyLength = window.history.length;
    history.push({ path: '/a' });
    await aTimeout(10);
    expect(window.location.pathname).to.equal('/a');
    history.replace({ path: '/b', query: 'tab=a' });
    await aTimeout(10);
    expect(window.location.pathname).to.equal('/b');
    expect(new URLSearchParams(location.search).get('tab')).to.equal('a');
    expect(window.history.length - historyLength).to.equal(1);
    history.push({ path: '/' });
    await aTimeout(10);
    expect(window.location.pathname).to.equal('/');
    history.push({ query: 'tab=bb' });
    await aTimeout(10);
    expect(window.location.pathname).to.equal('/');
    expect(new URLSearchParams(location.search).get('tab')).to.equal('bb');
  });
  it('getParams/updateParams', async () => {
    const historyLength = window.history.length;
    history.replace({ title: '123' });
    await aTimeout(10);
    expect(history.getParams().title).to.equal('123');
    expect(window.history.length - historyLength).to.equal(0);
    history.updateParams({ title: '321' });
    await aTimeout(10);
    expect(history.getParams().title).to.equal('321');
  });
  it('pushState/replaceState', async () => {
    const historyLength = window.history.length;
    history.pushState({}, 'title', '/a');
    await aTimeout(10);
    expect(window.location.pathname).to.equal('/a');
    history.replaceState({}, 'title', '/b?tab=a');
    expect(() => history.replaceState({ $key: 'adf' }, '', '')).to.throw();
    expect(() => history.replaceState({ $hasCloseHandle: 'adf' }, '', '')).to.throw();
    expect(() => history.replaceState({ $hasOpenHandle: 'adf' }, '', '')).to.throw();
    expect(() => history.replaceState({ $hasShouldCloseHandle: 'adf' }, '', '')).to.throw();
    await aTimeout(10);
    expect(window.location.pathname).to.equal('/b');
    expect(new URLSearchParams(location.search).get('tab')).to.equal('a');
    expect(window.history.length - historyLength).to.equal(1);
  });
  it('pushIgnoreCloseHandle', async () => {
    const { href } = window.location;
    let state = { open: true };
    const close = () => (state = { open: false });
    const open = () => (state = { open: true });
    // 打开 modal
    history.push({ close });
    await aTimeout(10);
    expect(() => history.push({ data: { $key: 1 } })).to.throw();
    // 关闭 modal
    history.back();
    await aTimeout(10);
    expect(state.open).to.false;
    // 打开 modal
    history.forward();
    await aTimeout(10);
    // 替换 close
    history.replace({ close, open });
    await aTimeout(10);
    expect(history?.state?.$hasOpenHandle).to.true;
    await aTimeout(10);
    expect(window.location.href).to.equal(href);
    // 跳转页面
    history.pushIgnoreCloseHandle({ path: '/b' });
    await aTimeout(10);
    expect(window.location.pathname).to.equal('/b');
    // 返回首页
    history.back();
    await aTimeout(10);
    expect(state.open).to.be.false;
    history.forward();
    await aTimeout(10);
    expect(window.location.pathname).to.equal('/b');
    // 点击链接
    history.pushIgnoreCloseHandle({ path: '/c' });
    await aTimeout(10);
    expect(window.location.pathname).to.equal('/c');
  });
  it('relative path', async () => {
    history.push({ path: '/' });
    await aTimeout(10);
    history.push({ path: './a' });
    await aTimeout(10);
    expect(window.location.pathname).to.equal('/a');
    history.replace({ path: '/a/b', query: 'tab=a' });
    await aTimeout(10);
    expect(window.location.pathname).to.equal('/a/b');
    expect(new URLSearchParams(location.search).get('tab')).to.equal('a');
    history.push({ path: '../c' });
    await aTimeout(10);
    expect(window.location.pathname).to.equal('/c');
    history.push({ query: 'tab=bb' });
    await aTimeout(10);
    expect(window.location.pathname).to.equal('/c');
    expect(new URLSearchParams(location.search).get('tab')).to.equal('bb');
  });
  // 在一个 window 中测试，所以 `basePath` 的测试必须放最后
  it('basePath', async () => {
    history.push({ path: '/d' });
    await aTimeout(10);
    history.basePath = '/d';
    history.push({ query: 'tab=bb' });
    await aTimeout(10);
    expect(window.location.pathname).to.equal('/d/');
    history.push({ hash: '#a' });
    await aTimeout(10);
    expect(window.location.pathname).to.equal('/d/');
    history.push({ path: '/a' });
    await aTimeout(10);
    expect(window.location.pathname).to.equal('/d/a');
    history.push({ path: '/' });
    await aTimeout(10);
    expect(window.location.pathname).to.equal('/d/');
    history.pushState({}, '', '/');
    await aTimeout(10);
    expect(window.location.pathname).to.equal('/d/');
    history.pushState({}, '', '/c');
    await aTimeout(10);
    expect(window.location.pathname).to.equal('/d/c');
    history.basePath = '';
    history.push({ path: '/' });
    await aTimeout(10);
    expect(window.location.pathname).to.equal('/');
  });
});
