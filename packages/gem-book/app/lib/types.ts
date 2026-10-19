export interface LinkItem {
  title: string;
  link: string;
}

export interface SidebarItem {
  title: string;
  /** 目录没有链接 */
  link?: string;
  children?: SidebarItem[];
}

/** `isNav` 的目录，当前页面在其中时侧边栏只显示该目录 */
export interface Section {
  link: string;
  items: SidebarItem[];
}

/** 站外链接，`icon` 是 `icons` 中的名称，没有图标时显示标题 */
export interface ExternalLink extends LinkItem {
  icon?: string;
}

/** layout 的数据，每个语言不同 */
/** 一个版本的文档的导航和侧边栏 */
export interface Content {
  sidebar: SidebarItem[];
  sections: Section[];
  /** 站内导航 */
  nav: LinkItem[];
}

export interface Site extends Content {
  /** 首页，没有 `README.md` 时是第一个页面 */
  home: string;
  /** 旧版本，`link` 是版本的首页 */
  versions: (Content & { name: string; link: string })[];
  links: ExternalLink[];
  langs: { code: string; name: string }[];
  /** 页脚的 HTML，没有配置时为空 */
  footer: string;
}

export interface Heading {
  level: number;
  id: string;
  text: string;
}

/** 首页模式中首页的 frontmatter，描述是 HTML */
export interface Home {
  hero?: { title?: string; desc?: string; actions?: LinkItem[] };
  features?: { icon?: string; title: string; desc: string }[];
}

export interface Doc {
  title: string;
  /** 服务端渲染的 HTML，使用 `htmlTemplate` 渲染 */
  html: string;
  /** 页面的描述，用于 `<meta name="description">` */
  description: string;
  headings: Heading[];
  home?: Home;
  editUrl?: string;
  lastUpdated?: { date: string; message: string; url?: string };
  prev?: LinkItem;
  next?: LinkItem;
  /** 旧版本的文档，`latest` 是最新版本中对应的页面 */
  oldVersion?: { name: string; latest: string };
}

/** 网站配置，由 CLI 生成，客户端也可以使用 */
export interface SiteConfig {
  title: string;
  /** 图标的 URL */
  icon?: string;
  /** 文档按语言放在子目录中，否则只有一个语言，文档在根目录 */
  i18n: boolean;
  /** 链接中保留文件名的排序数字 */
  displayRank: boolean;
  /** 首页（`README.md`）使用 `hero` 和 `features` 渲染，不显示侧边栏 */
  homeMode: boolean;
  /** 旧版本，文档目录中的版本目录，新的在前 */
  versions: string[];
  /** GitHub 或 GitLab 仓库地址 */
  github?: string;
  /** 编辑链接使用的分支 */
  sourceBranch: string;
  /** Algolia DocSearch 的配置，`local` 使用本地搜索 */
  docsearch?: 'local' | { appId?: string; apiKey: string; indexName: string };
  /** Google Analytics 的 ID */
  ga?: string;
  /** Gitalk 评论的配置 */
  comment?: { clientID: string; clientSecret: string; repo?: string; owner?: string; admin?: string[] };
}

/** 代码组中的代码块 */
export interface CodeFile {
  filename: string;
  /** `active` 默认显示，`hidden` 不显示标签 */
  status: string;
}

/** 本地搜索的索引，每个页面和页面中的二级标题是一项 */
export interface SearchItem {
  /** 页面路径（包括语言前缀）和 hash */
  id: string;
  /** 目录、页面和标题 */
  titles: string[];
  content: string;
  type: 'content' | `lvl${number}`;
}
