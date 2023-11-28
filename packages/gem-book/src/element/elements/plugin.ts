import { GemElement, connectStore } from '@mantou/gem';
import * as Gem from '@mantou/gem';
import { marked } from 'marked';
import { mediaQuery } from '@mantou/gem/helper/mediaquery';

import { theme } from '../helper/theme';
import { bookStore } from '../store';
import { BookConfig } from '../../common/config';
import { container } from '../elements/icons';

@connectStore(bookStore)
export class GemBookPluginElement<T = any> extends GemElement<T> {
  static devMode = bookStore.devMode;
  static marked = marked;
  static Gem = Gem;
  static theme = theme;
  static iconsContainer = container;
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
  static get currentLink() {
    return bookStore.getCurrentLink?.();
  }
}
