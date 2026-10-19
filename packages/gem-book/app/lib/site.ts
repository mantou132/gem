import type { Content, LinkItem, SidebarItem, Site } from './types';

/** 页面所在的旧版本，最新版本为空，例如 `/v1/guide` => `v1` */
export const getVersion = (path: string) =>
  __GEM_BOOK_CONFIG__.versions.find((version) => path === `/${version}` || path.startsWith(`/${version}/`)) || '';

/** 页面所在版本的导航和侧边栏 */
export const getContent = (site: Site, path: string): Content => {
  const version = getVersion(path);
  return (version && site.versions.find(({ name }) => name === version)) || site;
};

/** 当前页面的侧边栏：在 `isNav` 目录中时只显示该目录，否则显示其他文档 */
export function getSidebar({ sections, sidebar }: Pick<Content, 'sections' | 'sidebar'>, path: string) {
  const section = sections.find(({ link }) => path === link || path.startsWith(`${link}/`));
  return section ? section.items : sidebar;
}

/** 侧边栏中的链接，按显示顺序 */
export const flatLinks = (items: SidebarItem[]): LinkItem[] =>
  items.flatMap(({ title, link, children = [] }) => [...(link ? [{ title, link }] : []), ...flatLinks(children)]);

/** 首页模式中的首页，包括旧版本的首页 */
export const isHomePage = (path: string) =>
  __GEM_BOOK_CONFIG__.homeMode && (path === '/' || path === `/${getVersion(path)}`);

export const isGitLab = () =>
  !!__GEM_BOOK_CONFIG__.github && !new URL(__GEM_BOOK_CONFIG__.github).host.endsWith('github.com');
