import { aria, connectStore, customElement, GemElement, html } from '@mantou/gem';

import { joinPath } from '../lib/utils';
import { themeStore } from '../helper/theme';
import { bookStore, locationStore } from '../store';

import '@mantou/gem/elements/title';
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
@aria({ ariaHidden: 'true' })
export class Meta extends GemElement {
  render() {
    const { langList, lang = '', routes, homePage, getCurrentLink } = bookStore;
    const route = routes?.find((e) => e.pattern === locationStore.path && e.redirect);
    const canonicalLink = getAlternateUrl(
      lang && langList && !location.pathname.startsWith(`/${lang}`) ? langList[0].code : lang,
      route?.redirect,
    );
    const navItem = getCurrentLink?.();
    const isHomePage = homePage && homePage === navItem?.link;
    const description = isHomePage && navItem?.hero?.desc;
    return html`
      <gem-reflect>
        <gem-title></gem-title>
        <meta name="theme-color" content=${themeStore.backgroundColor} />
        ${description ? html`<meta name="description" content=${description} />` : ''}

        <!-- search engine -->
        <link rel="canonical" href=${canonicalLink} />
        ${langList?.map(({ code }) => html`<link rel="alternate" hreflang=${code} href=${getAlternateUrl(code)} />`)}
      </gem-reflect>
    `;
  }
}
