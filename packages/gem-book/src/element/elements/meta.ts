import { connectStore, customElement, GemElement, html } from '@mantou/gem';
import { mediaQuery } from '@mantou/gem/helper/mediaquery';

import { getURL, joinPath } from '../lib/utils';
import { themeStore } from '../helper/theme';
import { bookStore, locationStore } from '../store';

import '@mantou/gem/elements/reflect';

function getAlternateUrl(lang: string, pathname?: string) {
  const { origin } = location;
  const { path, query, hash } = locationStore;
  const fullPath = joinPath(lang, pathname || path);
  if (pathname) return `${origin}${fullPath}`;
  return `${origin}${fullPath}${query}${hash}`;
}

@customElement('gem-book-meta')
@connectStore(bookStore)
export class Meta extends GemElement {
  render() {
    const { langList, lang = '', routes, homePage, getCurrentLink, currentLinks } = bookStore;
    const route = routes?.find((route) => route.pattern === locationStore.path && route.redirect);
    const canonicalLink = getAlternateUrl(
      lang && langList && !location.pathname.startsWith(`/${lang}`) ? langList[0].code : lang,
      route?.redirect,
    );
    const navItem = getCurrentLink?.();
    const isHomePage = homePage && homePage === navItem?.link;
    const description = isHomePage && navItem?.hero?.desc;
    return html`
      <gem-reflect>
        <meta name="theme-color" content=${themeStore.backgroundColor} />
        ${description ? html`<meta name="description" content=${description} />` : ''}
        ${mediaQuery.isDataReduce
          ? null
          : currentLinks
              ?.filter((e) => e.type === 'file')
              .map(
                ({ originLink, hash }) =>
                  html`<link rel="prefetch" href=${getURL(joinPath(lang, originLink), hash)}></link>`,
              )}

        <!-- search engine -->
        <link rel="canonical" href=${canonicalLink} />
        ${langList?.map(({ code }) => html`<link rel="alternate" hreflang=${code} href=${getAlternateUrl(code)} />`)}
      </gem-reflect>
    `;
  }
}
