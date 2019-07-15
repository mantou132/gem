import { expect, aTimeout } from '@open-wc/testing';
import { history } from '..';

describe('history 测试', () => {
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
    // 打开 modal
    history.pushState({ close });
    await aTimeout(10);
    expect(() => history.pushState({ data: { $shouldClose: 1 } })).to.throw();
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
  });
});
