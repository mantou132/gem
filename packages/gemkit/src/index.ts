export { defineLazy, GemServerElement, server } from '@mantou/gem-ssr/decorators';

export {
  type ActionResult,
  type AppServerModule,
  type CookieOptions,
  type Cookies,
  type ErrorData,
  error,
  getRequestEvent,
  HttpError,
  type Locals,
  notFound,
  type RequestEvent,
  redirect,
  type ServerLoadContext,
  type ServerModule,
  submitAction,
} from './data';
export { getBasePath, localizePath, splitLanguage } from './i18n';
export type { Meta } from './meta';
export { errorRoute, layoutRoute, pageRoute, type RouteInfo, setOutlets } from './outlet';
export { type LayoutOptions, layout, type PageOptions, type Params, page } from './page';
export { formatTitle, type TitleOptions } from './title';
