import { connect, history, titleStore } from '@mantou/gem';
import { setServerElementLoader } from '@mantou/gem-ssr/client';

import { trimTrailingSlash } from './constants';
import { loadServerElement } from './data';
import { formatTitle, type TitleOptions } from './title';

const { path, query, hash } = history.getParams();
const trimmedPath = trimTrailingSlash(path);
if (trimmedPath !== path) history.replace({ path: trimmedPath, query, hash });

// 服务端已经输出了标题，避免路由初始化时重置标题
titleStore({ url: location.href });

setServerElementLoader(loadServerElement);

export function startClient(options: TitleOptions) {
  connect(titleStore, () => {
    document.title = formatTitle(titleStore.title, options);
  });
}
