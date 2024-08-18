import { GemElement, connectStore, globalemitter, Emitter, customElement } from '@mantou/gem';
import * as Gem from '@mantou/gem';
import { mediaQuery } from '@mantou/gem/helper/mediaquery';
import { logger } from '@mantou/gem/helper/logger';

import { theme } from '../helper/theme';
import { bookStore, locationStore } from '../store';
import { BookConfig } from '../../common/config';
import { debounce, throttle } from '../../common/utils';
import { icons } from '../elements/icons';
import { getRanges, getParts, joinPath, getURL, escapeHTML, capitalize, isGitLab } from '../lib/utils';
import { parseMarkdown, unsafeRenderHTML } from '../lib/renderer';
import { originDocLang, selfI18n } from '../helper/i18n';

/**
 * 获取资源的远端 GitHub raw 地址，如果使用 `DEV_MODE`，则返回本机服务的 URL
 *
 * - 优先使用 markdown 文件
 * - 支持相对路径
 * - 支持查询字符串
 * - `/docs/readme.md` 和 `docs/readme.md` 等效
 */
function getRemoteURL(originSrc = '', dev = GemBookPluginElement.devMode) {
  const { currentLink, lang, config, links } = GemBookPluginElement;
  const { github, sourceBranch, sourceDir, base } = config;
  let url = originSrc;
  if (originSrc && !/^(https?:)?\/\//.test(originSrc)) {
    if (!github || !sourceBranch) return '';
    let src = originSrc.startsWith('/') ? originSrc : `/${originSrc}`;
    if (originSrc.startsWith('.')) {
      const absPath = new URL(originSrc, `${location.origin}${currentLink!.originLink}`).pathname;
      const linkItem = links?.find(({ originLink, link, userFullPath }) =>
        [originLink, link, userFullPath].some((path) => path === absPath || `${path}.md` === absPath),
      );
      if (linkItem) return getURL(joinPath(lang, linkItem.originLink), linkItem.hash);
      src = new URL(originSrc, `${location.origin}${joinPath(sourceDir, lang, currentLink!.originLink)}`).pathname;
    }
    url = dev ? `/_assets${src}` : `${github}/raw/${sourceBranch}${joinPath(base, src)}`;
  }
  return url;
}

@connectStore(bookStore)
@customElement('gem-book-plugin')
export class GemBookPluginElement extends GemElement {
  static Gem = Gem;
  static Utils = {
    escapeHTML,
    capitalize,
    debounce,
    throttle,
    getRanges,
    getParts,
    getRemoteURL,
    parseMarkdown,
    unsafeRenderHTML,
    isGitLab,
  };

  static caches = new Map<typeof GemBookPluginElement, Map<string, any>>();
  static theme = theme;
  static icons = icons;
  static selfI18n = selfI18n;
  static originDocLang = originDocLang;
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
    return bookStore.lang || '';
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
  cacheState(this: GemElement & { state: any }, getDeps: () => (string | number | undefined | null)[]) {
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
