export interface TitleOptions {
  /** 网站标题，页面没有标题时使用 */
  title?: string;
  /** 页面标题模版，`%s` 会替换成页面标题 */
  titleTemplate?: string;
}

export function formatTitle(title: string | undefined, { title: siteTitle = '', titleTemplate = '%s' }: TitleOptions) {
  return title ? titleTemplate.replace('%s', title) : siteTitle;
}
