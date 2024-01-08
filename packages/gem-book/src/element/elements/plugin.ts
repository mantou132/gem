import { GemElement, connectStore, globalemitter, Emitter, customElement } from '@mantou/gem';
import * as Gem from '@mantou/gem';
import { mediaQuery } from '@mantou/gem/helper/mediaquery';
import { logger } from '@mantou/gem/helper/logger';

import { theme } from '../helper/theme';
import { bookStore, locationStore } from '../store';
import { BookConfig } from '../../common/config';
import { icons } from '../elements/icons';
import { getRanges, getParts, joinPath, getURL } from '../lib/utils';

import { Main } from './main';

/**
 * 获取资源的远端 GitHub raw 地址，如果使用 `DEV_MODE`，则返回本机服务的 URL
 *
 * - 支持相对路径
 * - `/docs/readme.md` 和 `docs/readme.md` 等效
 */
function getRemoteURL(originSrc = '', dev = GemBookPluginElement.devMode) {
  const { currentLink, lang, config, links } = GemBookPluginElement;
  const { github, sourceBranch, sourceDir, base } = config;
  const { originLink } = currentLink!;
  let url = originSrc;
  if (originSrc && !/^(https?:)?\/\//.test(originSrc)) {
    if (!github || !sourceBranch) return '';
    const rawOrigin = 'https://raw.githubusercontent.com';
    const repo = new URL(github).pathname;
    let src = originSrc.startsWith('/') ? originSrc : `/${originSrc}`;
    if (originSrc.startsWith('.')) {
      const absPath = new URL(originSrc, `${location.origin}${originLink}`).pathname;
      const link = links?.find(({ originLink }) => originLink === absPath);
      if (link) return getURL(joinPath(lang, link.originLink), link.hash);
      src = new URL(originSrc, `${location.origin}${joinPath(sourceDir, lang, originLink)}`).pathname;
    }
    url = dev ? `/_assets${src}` : `${rawOrigin}${repo}/${sourceBranch}${joinPath(base, src)}`;
  }
  return url;
}

@connectStore(bookStore)
@customElement('gem-book-plugin')
export class GemBookPluginElement<T = any> extends GemElement<T> {
  static Gem = Gem;
  static Utils = {
    getRanges,
    getParts,
    getRemoteURL,
    parseMarkdown(md: string) {
      return Main.parseMarkdown(md);
    },
  };

  static caches = new Map<typeof GemBookPluginElement, Map<string, any>>();
  static theme = theme;
  static icons = icons;
  static mediaQuery = mediaQuery;
  static locationStore = locationStore;
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

  /**
   * 自动缓存状态，下次挂载时应用状态
   *
   * @example
   * ```js
   * constructor() {
   *   super();
   *   this.cacheState(() => [this.src, this.range]);
   *}
   * ```
   */
  cacheState(getDeps: () => (string | number | undefined | null)[]) {
    if (!this.state) throw new Error('Only cache state');
    const cons = this.constructor as typeof GemBookPluginElement;
    const cache = cons.caches.get(cons) || new Map();
    cons.caches.set(cons, cache);
    this.memo(
      () => {
        const key = locationStore.path + getDeps().join();
        Object.assign(this.state!, cache.get(key));
        return () => cache.set(key, this.state);
      },
      () => getDeps(),
    );
  }
}
