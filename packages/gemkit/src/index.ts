export { defineLazy, GemServerElement, server } from '@mantou/gem-ssr/decorators';

export {
  type ActionResult,
  type CookieOptions,
  type Cookies,
  redirect,
  type ServerLoadContext,
  type ServerModule,
  submitAction,
} from './data';
export { getBasePath, localizePath, splitLanguage } from './i18n';
export { defineElement, GemkitOutletElement, layoutRoute, pageRoute, setOutlets } from './outlet';
export { getPageOptions, type LayoutOptions, layout, type PageOptions, type Params, page } from './page';
export { formatTitle, type TitleOptions } from './title';
