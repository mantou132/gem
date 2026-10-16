import type { GemRouteElement } from '../../elements/route';
import { html } from '../../lib/element';
import { history } from '../../lib/history';
import { expect, fixture, nextFrame, waitForPopState } from '../utils';

import '../../elements/route';

const routes = [{ pattern: '*', content: html`<div style="height: 1000px"></div>` }];

// 滚动位置在路由渲染后、`routechange` 之前更新
const rendered = (route: GemRouteElement) =>
  new Promise((resolve) => route.addEventListener('routechange', resolve, { once: true }));

let container: HTMLElement;

async function createRoute() {
  container = await fixture(
    html`<div style="height: 100px; overflow: auto"><gem-route .routes=${routes}></gem-route></div>`,
  );
  return container.querySelector<GemRouteElement>('gem-route')!;
}

async function navigate(route: GemRouteElement, action: () => void) {
  const promise = rendered(route);
  action();
  await promise;
}

describe('<gem-route> scrollContainer', () => {
  // 所有路由共享滚动位置，避免之前的路由记录位置
  afterEach(() => container.remove());

  it('导航时滚动到顶部，后退时恢复位置，同一条历史记录重新渲染时保持位置', async () => {
    const route = await createRoute();
    route.scrollContainer = container;
    await nextFrame();
    await navigate(route, () => history.push({ path: '/scroll-a' }));
    container.scrollTop = 300;
    await navigate(route, () => history.push({ path: '/scroll-b' }));
    expect(container.scrollTop).to.equal(0);
    container.scrollTop = 100;
    await navigate(route, () => (route.key = 1));
    expect(container.scrollTop).to.equal(100);
    await navigate(route, () => waitForPopState(() => history.back()));
    expect(container.scrollTop).to.equal(300);
  });

  it('前进后退时位置未知则滚动到顶部', async () => {
    const route = await createRoute();
    await navigate(route, () => history.push({ path: '/scroll-c' }));
    await navigate(route, () => history.push({ path: '/scroll-d' }));
    route.scrollContainer = container;
    await nextFrame();
    container.scrollTop = 50;
    await navigate(route, () => waitForPopState(() => history.back()));
    expect(container.scrollTop).to.equal(0);
  });

  it('前进后退时位置未知则保持文档的滚动位置', async () => {
    // 避免浏览器恢复滚动位置
    window.history.scrollRestoration = 'manual';
    document.body.style.minHeight = '3000px';
    const route = await createRoute();
    await navigate(route, () => history.push({ path: '/scroll-f' }));
    await navigate(route, () => history.push({ path: '/scroll-g' }));
    route.scrollContainer = document.scrollingElement!;
    await nextFrame();
    scrollTo(0, 50);
    await navigate(route, () => waitForPopState(() => history.back()));
    expect(scrollY).to.equal(50);
    scrollTo(0, 0);
    document.body.style.minHeight = '';
    window.history.scrollRestoration = 'auto';
  });

  it('滚动容器为空时不滚动', async () => {
    const route = await createRoute();
    route.scrollContainer = () => null;
    await nextFrame();
    container.scrollTop = 80;
    await navigate(route, () => history.push({ path: '/scroll-e' }));
    expect(container.scrollTop).to.equal(80);
  });
});
