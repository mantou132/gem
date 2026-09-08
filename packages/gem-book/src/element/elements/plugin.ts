import * as Gem from '@mantou/gem';
import { type Emitter, GemElement } from '@mantou/gem';
import { logger } from '@mantou/gem/helper/logger';
import { mediaQuery } from '@mantou/gem/helper/mediaquery';

import type { BookConfig } from '../../common/config';
import { debounce, throttle } from '../../common/utils';
import { icons } from '../elements/icons';
import { originDocLang, selfI18n } from '../helper/i18n';
import { theme, themeStore } from '../helper/theme';
import { parseMarkdown, unsafeRenderHTML } from '../lib/renderer';
import { capitalize, escapeHTML, getParts, getRanges, getURL, isGitLab, joinPath } from '../lib/utils';
import { bookStore, locationStore } from '../store';

/**
 * Get remote GitHub raw URL for resource, returns local server URL if `DEV_MODE`
 *
 * - Prefers markdown files
 * - Supports relative paths
 * - Supports query strings
 * - `/docs/readme.md` and `docs/readme.md` are equivalent
 */
function getRemoteURL(originSrc = '', dev = GemBookPluginElement.devMode) {
  const { currentLink, lang, config, links } = GemBookPluginElement;
  const { github, sourceBranch, sourceDir, base, importMap } = config;
  let url = originSrc;
  if (importMap) {
    for (const [prefix, replacement] of Object.entries(importMap)) {
      if (url.startsWith(prefix)) {
        const dest = typeof replacement === 'string' ? replacement : dev ? replacement.dev : replacement.prod;
        if (dest) {
          url = url.replace(prefix, dest);
          break;
        }
      }
    }
  }
  if (url && !/^(https?:)?\/\//.test(url)) {
    if (!github || !sourceBranch) return '';
    let src = url.startsWith('/') ? url : `/${url}`;
    if (url.startsWith('.')) {
      const absPath = new URL(url, `${location.origin}${currentLink!.originLink}`).pathname;
      const linkItem = links?.find(({ originLink, link, userFullPath }) =>
        [originLink, link, userFullPath].some((path) => path === absPath || `${path}.md` === absPath),
      );
      if (linkItem) return getURL(joinPath(lang, linkItem.originLink), linkItem.hash);
      src = new URL(url, `${location.origin}${joinPath(sourceDir, lang, currentLink!.originLink)}`).pathname;
    }
    url = dev
      ? `/_assets${src}`
      : isGitLab()
        ? `${github}/raw/${sourceBranch}${joinPath(base, src)}`
        : `https://raw.githubusercontent.com${new URL(github).pathname}/${sourceBranch}${joinPath(base, src)}`;
  }
  return url;
}

@connectStore(bookStore)
@customElement('gem-book-plugin')
export class GemBookPluginElement extends GemElement {
  /**Gem library exports */
  static Gem = Gem;
  /**Utility functions */
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
  static themeStore = themeStore;
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
   * Auto cache state, apply state on next mount
   *
   * @example
   * ```js
   * constructor() {
   *   super();
   *   this.cacheState(() => [this.src, this.range]);
   * }
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
