import { connect, html, history, useStore } from '@mantou/gem';
import { RouteItem, GemLightRouteElement } from '@mantou/gem/elements/route';
import { I18n } from '@mantou/gem/helper/i18n';

import { BookConfig, NavItem } from '../common/config';

import { selfI18n } from './helper/i18n';
import { getLinkPath, getUserLink, NavItemWithLink, flatNav, capitalize, getURL } from './lib/utils';
import { getRenderer } from './lib/renderer';

import { GemBookElement } from '.';

import './elements/main';
import './elements/404';

interface CurrentBookConfig {
  config: BookConfig;

  links: NavItemWithLink[];
  nav: NavItem[];
  routes: RouteItem[];

  lang: string;
  langList: { code: string; name: string }[];
  languagechangeHandle: (_: string) => void;
  currentSidebar: NavItemWithLink[];
  // 当没有提供 readme 或者 index 时，homePage 是第一个有效页面
  homePage: string;
  currentLinks: NavItemWithLink[];
  getCurrentLink: () => NavItemWithLink;
  isDevMode: () => boolean;
}

export const [bookStore, updateBookStore] = useStore<Partial<CurrentBookConfig>>({});

function getI18nSidebar(config: BookConfig = {}) {
  let sidebar: NavItem[] = [];
  let lang = '';
  let langList: { code: string; name: string }[] = [];
  let languagechangeHandle = (_lang: string) => {
    //
  };

  const sidebarConfig = config.sidebar || [];
  if (sidebarConfig instanceof Array) {
    sidebar = sidebarConfig;
  } else {
    langList = Object.keys(sidebarConfig).map((code) => ({ code, name: sidebarConfig[code].name }));
    const fallbackLanguage = langList[0].code;
    // detect language
    const i18n = new I18n<any>({ fallbackLanguage, resources: sidebarConfig, cache: true, urlParamsType: 'path' });
    lang = i18n.currentLanguage;
    history.basePath = `/${lang}`;
    sidebar = sidebarConfig[lang].data;
    languagechangeHandle = async (lang: string) => {
      const { path, query, hash } = history.getParams();
      // will modify `history.getParams()`
      history.basePath = `/${lang}`;
      await i18n.setLanguage(lang);
      // Use custom anchors id to ensure that the hash is correct after i18n switching
      history.replace({ path, query, hash });
      updateBookConfig(bookStore.config);
    };
  }

  if (lang) {
    selfI18n.setLanguage(lang in selfI18n.resources ? lang : selfI18n.fallbackLanguage);
  }
  return { sidebar, lang, langList, languagechangeHandle };
}

function processSidebar(sidebar: NavItem[], displayRank: boolean | undefined) {
  const process = (item: NavItem): NavItemWithLink => {
    return {
      ...item,
      // /guide/
      link: item.link && getUserLink(item.link, displayRank),
      // /guide/readme
      userFullPath: item.link && getLinkPath(item.link, displayRank),
      originLink: item.link,
      children: item.children?.map(process),
    } as NavItemWithLink;
  };
  return sidebar.map(process);
}

function getNav(sidebar: NavItem[], origin: NavItem[]) {
  const nav: NavItem[] = [];
  const traverseSidebar = (items: NavItem[]) => {
    items.forEach((item) => {
      if (item.isNav) {
        if (item.type === 'file' || (item.type === 'dir' && item.children?.length)) {
          nav.push(item);
        }
      } else if (item.children) {
        traverseSidebar(item.children);
      }
    });
  };
  traverseSidebar(sidebar);
  return nav.concat(origin).sort(({ navOrder: ao = 100 }, { navOrder: bo = 100 }) => ao - bo);
}

function getNavRoutes(nav: NavItem[]) {
  const routes: RouteItem[] = [];
  const getFirstLink = (item: NavItem) => {
    const list = [item];
    while (list.length) {
      const item = list.shift();
      switch (item?.type) {
        case 'file':
          return item.link;
        case 'dir':
          item.children && list.unshift(...item.children);
      }
    }
  };
  nav.forEach((nav) => {
    if (nav.type === 'dir') {
      const firstLink = getFirstLink(nav);
      if (nav.link !== firstLink) {
        routes.push({ pattern: nav.link, redirect: firstLink });
      }
    }
  });
  return routes;
}

function getRedirectRoutes(redirects: Record<string, string>, displayRank?: boolean): RouteItem[] {
  const list = Object.entries(redirects);
  return list
    .map(([link, redirect]) => ({
      pattern: getLinkPath(link, true),
      redirect: getLinkPath(redirect, displayRank),
    }))
    .concat(
      list.map(([link, redirect]) => ({
        pattern: getLinkPath(link, false),
        redirect: getLinkPath(redirect, displayRank),
      })),
    );
}

function getLinkRouters(links: NavItemWithLink[], title: string, lang: string, displayRank?: boolean) {
  const routes: RouteItem<NavItemWithLink>[] = [];
  links.forEach((item) => {
    const { title: pageTitle, link, userFullPath, originLink, hash } = item;
    const routeTitle = `${capitalize(pageTitle)}${pageTitle ? ' - ' : ''}${title}`;

    routes.push({
      title: routeTitle,
      pattern: link,
      async getContent() {
        const renderer = getRenderer({ lang, link: originLink, displayRank });
        const content = await (await fetch(getURL(originLink, lang, hash))).text();
        if (bookStore.isDevMode?.()) await new Promise((res) => setTimeout(res, 500));
        return html`<gem-book-main role="article" .renderer=${renderer as any} .content=${content}></gem-book-main>`;
      },
      data: item,
    });

    if (userFullPath !== link) {
      // /xxx/readme => /xxx/
      routes.push({
        pattern: userFullPath,
        redirect: link,
      });
    }

    if (!displayRank) {
      // /001-x/001-xxx => /x/xxx
      const path = getLinkPath(originLink, true);
      if (path !== link) {
        routes.push({
          pattern: path,
          redirect: link,
        });
      }
    }
  });

  if (!routes.some(({ pattern }) => pattern === '/')) {
    const firstRoutePath = routes.find(({ pattern }) => !!pattern)?.pattern;
    if (firstRoutePath) {
      routes.push({
        pattern: '/',
        redirect: firstRoutePath,
      });
    }
  }

  routes.push({
    pattern: '*',
    content: html`<gem-book-404 role="region" aria-label="not found"></gem-book-404>`,
  });

  return routes;
}
// 如果当前路径在 isNav 的目录中，则只返回 isNav 目录内容
// 如果当前路径不在 isNav 目录中，则返回除所有 isNav 目录的内容
// 不考虑嵌套 isNav 目录
function getCurrentSidebar(sidebar: NavItemWithLink[]) {
  const { path } = history.getParams();

  let currentLink: NavItemWithLink | undefined;
  let currentNavNode: NavItemWithLink | undefined;
  let resultNavNode: NavItemWithLink | undefined;
  const resultWithoutNav: NavItemWithLink[] = [];

  const traverseSidebar = (items: NavItemWithLink[], result: NavItemWithLink[]) => {
    items.forEach((item) => {
      let tempNode: NavItemWithLink | undefined;
      if (item.link === path) {
        currentLink = item;
        if (!resultNavNode && currentNavNode && item.type === 'file') {
          resultNavNode = currentNavNode;
        }
      }
      if (item.isNav && item.type === 'dir') {
        currentNavNode = item;
        tempNode = item;
      } else {
        result.push(item);
      }
      if (item.children) {
        item.children = traverseSidebar(item.children, []);
      }
      if (tempNode) {
        currentNavNode = undefined;
      }
    });
    return items;
  };
  traverseSidebar(sidebar, resultWithoutNav);
  const result = !currentLink ? [] : resultNavNode ? resultNavNode.children || [] : resultWithoutNav;
  return result.filter((e) => !e.sidebarIgnore && (!e.children || e.children.length !== 0));
}

function getHomePage(links: RouteItem[]) {
  const link = links.find((e) => e.pattern === '/');
  if (!link) return '';
  return link.redirect || link.pattern;
}

export function updateBookConfig(config?: BookConfig, gemBookElement?: GemBookElement) {
  const { sidebar, lang, langList, languagechangeHandle } = getI18nSidebar(config);
  const sidebarResult = processSidebar(sidebar, config?.displayRank);
  const links = flatNav(sidebarResult);
  const nav = getNav(sidebarResult, config?.nav || []);
  const routes = [
    ...getRedirectRoutes(config?.redirects || {}, config?.displayRank),
    ...getNavRoutes(nav),
    ...getLinkRouters(links, config?.title || '', lang, config?.displayRank),
  ];
  const currentSidebar = getCurrentSidebar(sidebarResult);
  const homePage = getHomePage(routes);
  const currentLinks = flatNav(currentSidebar).filter(
    (e) => !e.sidebarIgnore && (!config?.homeMode || e.link !== homePage),
  );
  updateBookStore({
    config,
    links,
    nav,
    routes,
    lang,
    langList,
    languagechangeHandle,
    homePage,
    currentSidebar,
    currentLinks,
  });
  if (gemBookElement) {
    updateBookStore({
      isDevMode: () => gemBookElement.dev,
      getCurrentLink: () => {
        return gemBookElement?.routeRef.element?.currentRoute?.data as NavItemWithLink;
      },
    });
  }
}

export const locationStore = GemLightRouteElement.createLocationStore();

// 每个页面的侧边栏可能不一样
connect(locationStore, () => {
  updateBookConfig(bookStore.config);
});
