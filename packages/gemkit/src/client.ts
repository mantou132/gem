import { connect, history, titleStore } from '@mantou/gem';
import { setServerElementLoader } from '@mantou/gem-ssr/client';

import { trimTrailingSlash } from './constants';
import { type AppClientModule, loadServerElement, setClientErrorHandler } from './data';
import { getCommittedTitle, routeStore, startRouter } from './navigation';
import { startPrefetch } from './prefetch';
import { formatTitle, type TitleOptions } from './title';

const { path, query, hash } = history.getParams();
const trimmedPath = trimTrailingSlash(path);
if (trimmedPath !== path) history.replace({ path: trimmedPath, query, hash });
// 路由提交前 outlet 外的元素也能读取
routeStore({ path: trimmedPath, query });

setServerElementLoader(loadServerElement);

/** 路由渲染之前调用，`appClient` 是 `src/app.client.ts` 的导出 */
export function startClient(options: TitleOptions, { handleError }: AppClientModule = {}) {
  setClientErrorHandler(handleError);
  // 导航到没有标题的历史记录时 gem 会清空标题，加载期间保持显示中的页面的标题，提交时再更新
  connect(history.store, () => {
    const title = getCommittedTitle();
    if (!titleStore.title && title) titleStore({ title });
  });
  connect(titleStore, () => {
    document.title = formatTitle(titleStore.title, options);
  });
  startRouter();
  startPrefetch();
}
