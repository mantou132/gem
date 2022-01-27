import { connectStore, customElement, GemElement, html, history } from '@mantou/gem';
import { mediaQuery } from '@mantou/gem/helper/mediaquery';

import { getAlternateUrl, getRemotePath } from '../lib/utils';
import { bookStore } from '../store';

import '@mantou/gem/elements/reflect';

@customElement('gem-book-meta')
@connectStore(bookStore)
export class Meta extends GemElement {
  render() {
    const { links, langList, lang = '', routes, homePage, getCurrentLink } = bookStore;
    const { path } = history.getParams();
    const route = routes?.find((route) => route.pattern === path && route.redirect);
    const canonicalLink = getAlternateUrl(
      lang && langList && !location.pathname.startsWith(`/${lang}`) ? langList[0].code : lang,
      route?.redirect,
    );
    const navItem = getCurrentLink?.();
    const isHomePage = homePage && homePage === navItem?.link;
    const description = isHomePage && navItem?.hero?.desc;
    return html`
      <gem-reflect>
        ${description ? html`<meta name="description" content=${description} />` : ''}
        ${mediaQuery.isDataReduce
          ? null
          : links
              ?.filter((e) => e.type === 'file')
              .map(({ originLink }) => html`<link rel="prefetch" href=${getRemotePath(originLink, lang)}></link>`)}

        <!-- search engine -->
        <link rel="canonical" href=${canonicalLink} />
        ${langList?.map(({ code }) => html`<link rel="alternate" hreflang=${code} href=${getAlternateUrl(code)} />`)}
      </gem-reflect>
    `;
  }
}
