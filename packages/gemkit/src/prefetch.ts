import { history } from '@mantou/gem';
import { GemLinkElement } from '@mantou/gem/elements/link';

import { trimTrailingSlash } from './constants';
import { prefetchElements, prefetchServerData } from './data';
import { needServerData } from './navigation';
import { matchRoutes } from './route';

/**
 * 预取路径（不包含语言前缀）的 layout 和页面模块、服务端数据和纯服务端元素
 *
 * 和导航时一样复用已显示的 layout 的数据，只有它的服务端数据时不需要请求
 */
function prefetch(path: string, search: string) {
  const routes = matchRoutes(path);
  for (const { info } of routes) info.load();
  if (needServerData(routes)) prefetchServerData(path, search);
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

/** 链接 hover 或获得焦点时预取 */
export function startPrefetch() {
  const onIntent = (event: Event) => {
    const target = getLinkTarget(event);
    const { path } = history.getParams();
    if (target && target.path + target.search !== path + location.search) {
      prefetch(target.path, target.search);
    }
  };
  document.addEventListener('pointerover', onIntent);
  document.addEventListener('focusin', onIntent);
}
