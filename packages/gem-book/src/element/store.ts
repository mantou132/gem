import { connect, createStore, history, html } from '@mantou/gem';
import type { RouteItem } from '@mantou/gem/elements/route';
import { GemLightRouteElement } from '@mantou/gem/elements/route';
import { I18n } from '@mantou/gem/helper/i18n';

import type { BookConfig, NavItem } from '../common/config';
import { getLinkPath, getUserLink } from '../common/utils';
import type { GemBookElement } from '.';
import { originDocLang, selfI18n } from './helper/i18n';
import type { NavItemWithLink } from './lib/utils';
import { capitalize, flatNav, getURL, joinPath } from './lib/utils';

interface CurrentBookConfig {
  config: BookConfig;

  links: NavItemWithLink[];
  nav: NavItem[];
  routes: RouteItem[];

  lang: string;
  langList: { code: string; name: string }[];
  currentSidebar: NavItemWithLink[];
  // 当没有提供 readme 或者 index 时，homePage 是第一个有效页面
  homePage: string;
  currentLinks: NavItemWithLink[];
  getCurrentLink: () => NavItemWithLink | undefined;
  isDevMode: () => boolean;

  slots: {
    sidebarBefore?: Element | null;
    mainBefore?: Element | null;
    mainAfter?: Element | null;
    navInside?: Element | null;
    logoAfter?: Element | null;
  };
}

export const bookStore = createStore<Partial<CurrentBookConfig>>({});

function getI18nSidebar(config: BookConfig = {}) {
  let sidebar: NavItem[] = [];
  let lang = '';
  let langList: { code: string; name: string }[] = [];

  const sidebarConfig = config.sidebar || [];
  if (Array.isArray(sidebarConfig)) {
    sidebar = sidebarConfig;
  } else {
    langList = Object.keys(sidebarConfig).map((code) => ({ code, name: sidebarConfig[code].name }));
    const { currentLanguage } = new I18n<any>({
      fallbackLanguage: originDocLang in sidebarConfig ? originDocLang : langList[0]?.code,
      resources: sidebarConfig,
      cache: true,
      urlParamsType: 'path',
    });
    lang = currentLanguage;
    history.basePath = `/${lang}`;
    sidebar = sidebarConfig[lang].data;
    // 初始页面需要立即更新才能读取到
    locationStore.path = history.getParams().path;
    if (lang !== selfI18n.currentLanguage) {
      selfI18n.setLanguage(lang);
    }
  }

  return { sidebar, lang, langList };
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

function getNav(sidebar: NavItem[], origin: NavItem[] = []) {
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

function getNavRoutes(navList: NavItem[]) {
  const routes: RouteItem[] = [];
  const getFirstLink = (navItem: NavItem) => {
    const list = [navItem];
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
  navList.forEach((nav) => {
    if (nav.type === 'dir') {
      const firstLink = getFirstLink(nav);
      if (nav.link !== firstLink) {
        routes.push({
          pattern: nav.link,
          redirect: firstLink,
        });
      }
    }
  });
  return routes;
}

function getRedirectRoutes(redirects: Record<string, string> = {}, displayRank?: boolean) {
  const list = Object.entries(redirects);
  const routes: RouteItem[] = [];
  list.forEach(([link, redirect]) => {
    const patternWithRank = getLinkPath(link, true);
    const patternWithoutRank = getLinkPath(link, false);
    routes.push({
      pattern: patternWithRank,
      redirect: getLinkPath(redirect, displayRank),
    });
    if (patternWithoutRank !== patternWithRank) {
      routes.push({
        pattern: patternWithoutRank,
        redirect: getLinkPath(redirect, displayRank),
      });
    }
  });
  return routes;
}

function getLinkRouters(links: NavItemWithLink[], title = '', lang: string, displayRank?: boolean) {
  const routes: RouteItem<NavItemWithLink>[] = [];
  links.forEach((item) => {
    const { title: pageTitle, link, userFullPath, originLink, hash } = item;
    const routeTitle = `${capitalize(pageTitle)}${pageTitle ? ' - ' : ''}${title}`;
    const fetchContent = async (l: string) => await (await fetch(getURL(joinPath(l, originLink), hash))).text();
    routes.push({
      title: routeTitle,
      pattern: link,
      async getContent() {
        await import('./elements/main');
        const fmAndH1Reg = /.*?# .*?(\n|$)+/s;
        let content = await fetchContent(lang);
        let useLang = lang;
        if (originDocLang && !content.replace(fmAndH1Reg, '').trim()) {
          content +=
            `<gbp-trans-status></gbp-trans-status>` +
            (await fetchContent(originDocLang)).replace(fmAndH1Reg, '').trimStart();
          useLang = originDocLang;
        }
        if (bookStore.isDevMode?.()) await new Promise((res) => setTimeout(res, 500));
        return html`<gem-book-main lang=${useLang} .content=${content}></gem-book-main>`;
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
    async getContent() {
      await import('./elements/404');
      return html`<gem-book-404></gem-book-404>`;
    },
  });

  return routes;
}
// 如果当前路径在 isNav 的目录中，则只返回 isNav 目录内容
// 如果当前路径不在 isNav 目录中，则返回除所有 isNav 目录的内容
// 不考虑嵌套 isNav 目录
function getCurrentSidebar(sidebar: NavItemWithLink[]) {
  let currentLink: NavItemWithLink | undefined;
  let currentNavNode: NavItemWithLink | undefined;
  let resultNavNode: NavItemWithLink | undefined;
  const resultWithoutNav: NavItemWithLink[] = [];

  const traverseSidebar = (items: NavItemWithLink[], result: NavItemWithLink[]) => {
    items.forEach((item) => {
      let tempNode: NavItemWithLink | undefined;
      if (item.link === locationStore.path) {
        if (item.type === 'file' || item.isNav) {
          currentLink = item;
        }
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
  const { sidebar, lang, langList } = getI18nSidebar(config);
  const sidebarResult = processSidebar(sidebar, config?.displayRank);
  const links = flatNav(sidebarResult);
  const nav = getNav(sidebarResult, config?.nav);
  const routes = [
    ...getRedirectRoutes(config?.redirects, config?.displayRank),
    ...getNavRoutes(nav),
    ...getLinkRouters(links, config?.title, lang, config?.displayRank),
  ];
  const currentSidebar = getCurrentSidebar(sidebarResult);
  const homePage = getHomePage(routes);
  const currentLinks = flatNav(currentSidebar).filter(
    (e) => !e.sidebarIgnore && (!config?.homeMode || e.link !== homePage),
  );
  bookStore({
    config,
    links,
    nav,
    routes,
    lang,
    langList,
    homePage,
    currentSidebar,
    currentLinks,
  });
  if (gemBookElement) {
    bookStore({
      isDevMode: () => gemBookElement.dev,
      getCurrentLink: () => {
        return gemBookElement?.routeRef.value?.currentRoute?.data as NavItemWithLink | undefined;
      },
    });
  }
}

export const locationStore = GemLightRouteElement.createLocationStore();

// 每个页面的侧边栏可能不一样
connect(locationStore, () => {
  updateBookConfig(bookStore.config);
});
