import type { LinkItem, SiteConfig } from '../app/lib/types.ts';

/** 配置文件 `gem-book.cli.json` */
export interface GemBookConfig {
  /** 网站标题，默认使用 `package.json` 的 `title` 或者目录名 */
  title?: string;
  /** 图标的路径（相对于项目目录）或者网址 */
  icon?: string;
  /** 文档按语言放在子目录中，例如 `docs/en`、`docs/zh` */
  i18n?: boolean;
  /** 没有开启多语言时文档的语言，开启时是默认语言 */
  fallbackLanguage?: string;
  /** GitHub 或 GitLab 仓库地址，默认使用 git 的 `origin` */
  github?: string;
  /** 编辑链接使用的分支，默认使用当前分支 */
  sourceBranch?: string;
  /** 链接中保留文件名的排序数字 */
  displayRank?: boolean;
  /** 首页（`README.md`）使用 `hero` 和 `features` 渲染，不显示侧边栏 */
  homeMode?: boolean;
  /**
   * 旧版本，新的在前，例如 `["v2", "v1"]`，文档放在文档目录的版本目录中（例如 `docs/v1/en`），
   * 页面地址是 `/en/v1/guide`，最新版本的文档不变
   */
  versions?: string[];
  /**
   * 忽略的文档或目录，相对于语言目录，没有 `/` 时匹配任意目录中的名称，
   * `*` 匹配名称中的任意字符，`**` 匹配任意层级的目录，例如 `["drafts", "*.draft.md", "guide/**"]`
   */
  ignored?: string[];
  /** 导航中的链接，站外链接显示在右侧，标题是 `github` 等时显示图标 */
  nav?: LinkItem[];
  /** 页脚，Markdown 格式 */
  footer?: string;
  /** 内置主题的名称（例如 `dark`）或者主题文件的路径 */
  theme?: string;
  /**
   * 全站插件，模块的路径（相对于项目目录）或者包名，和网站一起打包，
   * 可以定义在文档中直接使用的元素，例如 `["docs/plugins/hello.ts"]`
   */
  plugins?: string[];
  /** 全局变量，`<gbp-var>` 使用 */
  global?: Record<string, unknown>;
  /** 搜索，Algolia DocSearch 的配置或者 `local`（本地搜索） */
  docsearch?: SiteConfig['docsearch'];
  /** Gitalk 评论 */
  comment?: SiteConfig['comment'];
  /**
   * 路径前缀映射，`<gbp-raw>` 等插件的 `src` 和 `<gbp-api>` 读取父类时使用，
   * 例如把包名映射到源码目录：`{ "@mantou/tap-ui/": "node_modules/@mantou/tap-ui/src/" }`
   */
  importMap?: Record<string, string>;
  /** Google Analytics 的 ID */
  ga?: string;
  /** 网站的地址，例如 `https://book.gemjs.org`，构建时输出 `sitemap.xml` */
  site?: string;
  /** 开发服务器的端口 */
  port?: number;
}
