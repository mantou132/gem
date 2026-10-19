/// <reference path="./env.d.ts" />

/**
 * 插件的公开 API（`gem-book/plugin`），全站插件和本地的 `<gbp-import>` 模块可以使用
 */
import { createStore } from '@mantou/gem';

import type { Doc, Site, SiteConfig } from './lib/types';

export { htmlTemplate } from './lib/template';
export { type Theme, theme } from './lib/theme';
export type { Content, Doc, Heading, LinkItem, SidebarItem, Site, SiteConfig } from './lib/types';
export { getGlobal } from './lib/utils';

export interface BookState {
  /** 网站配置 */
  config: SiteConfig;
  /** 当前语言 */
  lang: string;
  /** 当前页面的路径，不包括语言前缀，例如 `/v1/guide` */
  path: string;
  /** 当前页面所在的旧版本，最新版本为空 */
  version: string;
  /** 网站的导航和侧边栏，包括旧版本的 */
  site?: Site;
  /** 当前文档，不是文档页面（例如 404）时为空 */
  doc?: Doc;
}

/**
 * 网站和当前页面的数据，服务端渲染时也可以使用，切换页面时更新，
 * 元素使用 `@connectStore(bookStore)` 跟随更新
 */
// 布局和页面在渲染前根据自己的数据更新，服务端和客户端的值一样，指定 key 为空，不需要同步到客户端
export const bookStore = createStore<BookState>(
  { config: __GEM_BOOK_CONFIG__, lang: '', path: '', version: '', site: undefined, doc: undefined },
  undefined,
);
