import { connect, history } from '@mantou/gem';
import { GemLinkElement } from '@mantou/gem/elements/link';

import { trimTrailingSlash } from './constants';
import { getHistoryEntry, loadPageElements, prefetchElements, prefetchServerData } from './data';
import { canReuseLayoutData, getLayoutParams, matchRoutes } from './outlet';

/**
 * 预取路径（不包含语言前缀）的 layout 和页面模块、服务端数据和纯服务端元素，`from` 是当前路径
 *
 * 和 `loadLayout` 一样复用 layout 的数据，只有它的服务端数据时不需要请求
 */
function prefetch(path: string, search: string, from: string) {
  const current = matchRoutes(from);
  let needData = false;
  for (const { info, params } of matchRoutes(path)) {
    info.load();
    if (!info.server) continue;
    const reused = info.layout && current.find((route) => route.info === info);
    if (!reused || !canReuseLayoutData(getLayoutParams(reused.params), getLayoutParams(params))) needData = true;
  }
  if (needData) prefetchServerData(path, search);
  prefetchElements(path, search);
}

// 指向站内页面的链接，返回不包含语言前缀的路径
function getLinkTarget(event: Event) {
  const link = event.composedPath().find((node) => node instanceof GemLinkElement);
  if (!link || link.target === '_blank') return;
  const url = new URL(link._getLocationString(), location.href);
  if (url.origin !== location.origin) return;
  return { path: trimTrailingSlash(url.pathname), search: url.search };
}

/** 链接 hover 或获得焦点时预取，导航时页面模块、数据和纯服务端元素并行请求 */
export function startPrefetch() {
  const onIntent = (event: Event) => {
    const target = getLinkTarget(event);
    const { path } = history.getParams();
    if (target && target.path + target.search !== path + location.search) {
      prefetch(target.path, target.search, path);
    }
  };
  document.addEventListener('pointerover', onIntent);
  document.addEventListener('focusin', onIntent);

  // 先于路由更新执行，路由加载时使用这里的请求，前进后退时使用缓存，不需要请求
  let current = history.getParams().path;
  connect(history.store, () => {
    const { path } = history.getParams();
    const cached = !!getHistoryEntry();
    if (path !== current && !cached) prefetch(path, location.search, current);
    current = path;
    // 页面中有没有纯服务端元素渲染后才知道，所以总是请求，和页面模块、数据并行
    if (!cached) loadPageElements();
  });
}
