/** 项目目录，运行命令的目录 */
declare const __GEM_BOOK_PROJECT_DIR__: string;
/** 文档目录 */
declare const __GEM_BOOK_DOCS_DIR__: string;
/** 网站配置，客户端也可以使用 */
declare const __GEM_BOOK_CONFIG__: import('./lib/types').SiteConfig;
/** 配置的导航，站外链接显示在右侧 */
declare const __GEM_BOOK_NAV__: import('./lib/types').LinkItem[];
/** 配置的页脚，Markdown 格式 */
declare const __GEM_BOOK_FOOTER__: string;
/** 配置的路径前缀映射，插件的 `src` 和 `<gbp-api>` 读取父类时使用 */
declare const __GEM_BOOK_IMPORT_MAP__: Record<string, string>;
/** 配置的忽略的文档或目录 */
declare const __GEM_BOOK_IGNORED__: string[];
/** 配置的全局变量，`<gbp-var>` 使用 */
declare const __GEM_BOOK_GLOBAL__: Record<string, unknown>;

/** gemkit 生成的 i18n 模块，gem-book 总是至少有一个语言 */
declare module '$gemkit/i18n' {
  export const i18n: import('@mantou/gem/helper/i18n').I18n<typeof import('./locales/en.json')>;
  export const languages: string[];
  export const defaultLanguage: string;
  export const prefixDefaultLanguage: boolean;
  /** 切换语言的路径，`path` 默认是当前路径 */
  export const localizePath: (lang: string, path?: string) => string;
}
