// 供 `@server()`/`@lazy()` 的编译产物使用，编译时从导入装饰器的模块中导入，不需要直接调用
export { client, defineLazy, GemServerElement, lazy, server } from '@mantou/gem-ssr/decorators';

export {
  type ActionResult,
  type AppClientModule,
  type AppServerModule,
  type CookieOptions,
  type Cookies,
  type EndpointModule,
  type ErrorData,
  endpoint,
  error,
  type FormActions,
  formActions,
  getRequestEvent,
  type Handle,
  HttpError,
  invalidate,
  type Locals,
  navigationStore,
  notFound,
  type Platform,
  type PlatformContext,
  type PlatformEnv,
  type RequestEvent,
  type RequestHandler,
  type RequestMethod,
  redirect,
  revalidatePath,
  type SchemaIssue,
  type ServerLoadContext,
  type ServerModule,
  type StandardSchemaV1,
  submitAction,
} from './data';
export type { Meta } from './meta';
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
