// 供 `@server()`/`@lazy()` 的编译产物使用，编译时从导入装饰器的模块中导入，不需要直接调用
export { client, defineLazy, GemServerElement, lazy, server } from '@mantou/gem-ssr/decorators';

export { type ErrorData, error, HttpError, notFound, redirect } from './error';
export type { Meta } from './meta';
export {
  type FormActions,
  formActions,
  invalidate,
  navigationStore,
  routeStore,
  submitAction,
} from './navigation';
export {
  type LayoutOptions,
  type LoadContext,
  layout,
  type PageOptions,
  type Params,
  page,
  type RouteContext,
} from './page';
export { endpoint, getRequestEvent, revalidatePath } from './request';
export { formatTitle, type TitleOptions } from './title';
export type {
  ActionResult,
  AppClientModule,
  AppServerModule,
  CookieOptions,
  Cookies,
  EndpointModule,
  Handle,
  Locals,
  Platform,
  PlatformContext,
  PlatformEnv,
  RequestEvent,
  RequestHandler,
  RequestMethod,
  SchemaIssue,
  ServerLoadContext,
  ServerModule,
  StandardSchemaV1,
} from './types';
