export interface FrontMatter {
  title?: string;
  /** 页面的 `<meta name="description">`，默认使用首页的 `hero.desc` 或者第一段文本 */
  description?: string;
  isNav?: boolean;
  navTitle?: string;
  navOrder?: number;
  sidebarIgnore?: boolean;
  redirect?: string;

  /** below only dir */
  reverse?: boolean;
  groups?: { title: string; members: string[] }[];

  /** below only homepage */
  hero?: Hero;
  features?: Feature[];
}

export interface Hero {
  title?: string;
  desc?: string;
  actions?: { text: string; link: string }[];
}

export interface Feature {
  icon?: string;
  title: string;
  desc: string;
}
