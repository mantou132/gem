import type { FrontMatter } from './frontmatter';

export type NavItem = FrontMatter & {
  title: string;
  link: string;
  type?: 'dir' | 'file' | 'heading';
  children?: NavItem[];

  // md file
  hash?: string;
};

export type SidebarConfig = NavItem[] | { [lang: string]: { name: string; data: NavItem[] } };

interface CommonConfig {
  title?: string;
  nav?: NavItem[];
  github?: string;
  // e.g: packages/gem-book
  base?: string;
  // docs dir
  sourceDir?: string;
  sourceBranch?: string;
  displayRank?: boolean;
  homeMode?: boolean;
  footer?: string;
  global?: any;
}

export type BookConfig = {
  version?: string;
  redirects?: Record<string, string>;
  sidebar?: SidebarConfig;
  // navbar icon absolute path
  icon?: string;
  onlyFile?: boolean;
} & CommonConfig;

export type SupportLang = 'zh' | 'en';

export interface CliUniqueConfig {
  icon?: string;
  output?: string;
  i18n?: boolean;
  // packages/gem-book/src/element/helper/i18n.ts
  fallbackLanguage?: SupportLang | '';
  plugin?: string[];
  ga?: string;
  template?: string;
  ignored?: string[];
  theme?: string;
  build?: boolean;
  port?: number;
  site?: string;
  json?: boolean;
  debug?: boolean;
  config?: string;
}

export type CliConfig = CliUniqueConfig & CommonConfig;
