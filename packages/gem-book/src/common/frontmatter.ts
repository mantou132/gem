export interface FrontMatter {
  title?: string;
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
