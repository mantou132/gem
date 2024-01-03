import { GemElement, connectStore, globalemitter, Emitter, customElement } from '@mantou/gem';
import * as Gem from '@mantou/gem';
import { marked } from 'marked';
import { mediaQuery } from '@mantou/gem/helper/mediaquery';
import { logger } from '@mantou/gem/helper/logger';

import { theme } from '../helper/theme';
import { bookStore } from '../store';
import { BookConfig } from '../../common/config';
import { icons } from '../elements/icons';

@connectStore(bookStore)
@customElement('gem-book-plugin')
export class GemBookPluginElement<T = any> extends GemElement<T> {
  static marked = marked;
  static Gem = Gem;
  static theme = theme;
  static icons = icons;
  static mediaQuery = mediaQuery;
  static config = new Proxy<Partial<BookConfig>>(
    {},
    {
      get(_, key: keyof BookConfig) {
        return bookStore.config?.[key];
      },
    },
  );
  static get links() {
    return bookStore.links;
  }
  static get nav() {
    return bookStore.nav;
  }
  static get routes() {
    return bookStore.routes;
  }
  static get lang() {
    return bookStore.lang;
  }
  static get langList() {
    return bookStore.langList;
  }
  static get homePage() {
    return bookStore.homePage;
  }
  static get currentSidebar() {
    return bookStore.currentSidebar;
  }
  static get currentLinks() {
    return bookStore.currentLinks;
  }
  static get devMode() {
    return bookStore.isDevMode?.();
  }
  static get currentLink() {
    return bookStore.getCurrentLink?.();
  }

  @globalemitter error: Emitter<ErrorEvent | Event> = logger.error;

  /**获取资源的远端 GitHub raw 地址，如果使用 `DEV_MODE`，则返回本机服务的 URL */
  getRemoteURL(originSrc = '', dev = GemBookPluginElement.devMode) {
    const config = GemBookPluginElement.config;
    let url = originSrc;
    if (originSrc && !/^(https?:)?\/\//.test(originSrc)) {
      if (!config.github || !config.sourceBranch) return '';
      const rawOrigin = 'https://raw.githubusercontent.com';
      const repo = new URL(config.github).pathname;
      const src = `${originSrc.startsWith('/') ? '' : '/'}${originSrc}`;
      const basePath = config.base ? `/${config.base}` : '';
      url = dev ? `/_assets${src}` : `${rawOrigin}${repo}/${config.sourceBranch}${basePath}${src}`;
    }
    return url;
  }
}
