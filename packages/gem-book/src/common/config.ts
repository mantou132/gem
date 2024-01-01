import { FrontMatter } from './frontmatter';

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
}

export type BookConfig = {
  redirects: Record<string, string>;
  sidebar: SidebarConfig;
  // navbar icon absolute path
  icon?: string;
  onlyFile?: boolean;
} & CommonConfig;

export interface CliUniqueConfig {
  // relative path
  icon?: string;
  output?: string;
  i18n?: boolean;
  plugin?: string[];
  ga?: string;
  template?: string;
  theme?: string;
  build?: boolean;
  json?: boolean;
  debug?: boolean;
}

export type CliConfig = CliUniqueConfig & CommonConfig;
