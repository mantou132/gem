export { defineLazy, GemServerElement, lazy, server } from '@mantou/gem-ssr/decorators';

export {
  type ActionResult,
  type AppServerModule,
  type CookieOptions,
  type Cookies,
  type EndpointModule,
  type ErrorData,
  error,
  getRequestEvent,
  HttpError,
  type Locals,
  notFound,
  type RequestEvent,
  type RequestHandler,
  type RequestMethod,
  redirect,
  type ServerLoadContext,
  type ServerModule,
  submitAction,
} from './data';
export { getBasePath, localizePath, splitLanguage } from './i18n';
export type { Meta } from './meta';
export { errorRoute, layoutRoute, pageRoute, type RouteInfo, setOutlets } from './outlet';
export {
  type LayoutOptions,
  type LoadContext,
  layout,
  type PageOptions,
  type Params,
  page,
  type RouteContext,
} from './page';
export { formatTitle, type TitleOptions } from './title';
