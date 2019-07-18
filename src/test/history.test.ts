import { expect, aTimeout } from '@open-wc/testing';
import { history } from '..';

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
  });
  it('push/replace', async () => {
    const historyLength = window.history.length;
    history.push({ path: '/a' });
    await aTimeout(10);
    expect(window.location.pathname).to.equal('/a');
    history.replace({ path: '/b', query: 'tab=a' });
    await aTimeout(10);
    expect(window.location.pathname).to.equal('/b');
    expect(history.location.query.get('tab')).to.equal('a');
    expect(window.history.length - historyLength).to.equal(1);
  });
  it('pushState/replaceState/pushWithoutCloseHandle', async () => {
    const { href } = window.location;
    const { currentIndex } = history.historyState;
    let state = { open: true };
    const close = () => (state = { open: false });
    const open = () => (state = { open: true });
    // 打开 modal
    history.pushState({ close });
    await aTimeout(10);
    expect(() => history.pushState({ data: { $shouldClose: 1 } })).to.throw();
    expect(() => history.pushState({ data: { $close: 1 } })).to.throw();
    expect(() => history.pushState({ data: { $open: 1 } })).to.throw();
    expect(() => history.pushState({ data: { $key: 1 } })).to.throw();
    // 关闭 modal
    history.back();
    await aTimeout(10);
    expect(state.open).to.false;
    // 打开 modal
    history.forward();
    await aTimeout(10);
    // 替换 close
    history.replaceState({ close, open });
    await aTimeout(10);
    expect(history.historyState.list[history.historyState.currentIndex].state.$open).to.true;
    await aTimeout(10);
    expect(window.location.href).to.equal(href);
    // 跳转页面
    history.pushWithoutCloseHandle({ path: '/b' });
    await aTimeout(10);
    expect(window.location.pathname).to.equal('/b');
    expect(history.historyState.currentIndex).to.equal(currentIndex + 1);
    // 返回首页
    history.back();
    await aTimeout(10);
    expect(history.historyState.currentIndex).to.equal(currentIndex);
    expect(state.open).to.be.false;
    history.forward();
    await aTimeout(10);
    expect(window.location.pathname).to.equal('/b');
    // 卸载页面
    const sessionStorageLength = sessionStorage.length;
    dispatchEvent(new CustomEvent('unload'));
    expect(sessionStorage.length).to.equal(sessionStorageLength + 1);
  });
});
