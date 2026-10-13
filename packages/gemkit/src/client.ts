import { connect, history, titleStore } from '@mantou/gem';

import { trimTrailingSlash } from './constants';
import { formatTitle, type TitleOptions } from './title';

import '@mantou/gem-ssr/client';

const { path, query, hash } = history.getParams();
const trimmedPath = trimTrailingSlash(path);
if (trimmedPath !== path) history.replace({ path: trimmedPath, query, hash });

// 服务端已经输出了标题，避免路由初始化时重置标题
titleStore({ url: location.href });

export function startClient(options: TitleOptions) {
  connect(titleStore, () => {
    document.title = formatTitle(titleStore.title, options);
  });
}
