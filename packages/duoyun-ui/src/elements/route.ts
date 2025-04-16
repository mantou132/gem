import { GemLightRouteElement, GemRouteElement } from '@mantou/gem/elements/base/route';
import { customElement } from '@mantou/gem/lib/decorators';

export type { RouteItem, RouteOptions, RoutesObject } from '@mantou/gem/elements/base/route';
// esm.sh bug: import('https://esm.sh/duoyun-ui/elements/button')
// export * from '@mantou/gem/elements/base/route';
export {
  createHistoryParams,
  createPath,
  GemLightRouteElement,
  GemRouteElement,
  matchPath,
} from '@mantou/gem/elements/base/route';

@customElement('dy-route')
export class DuoyunRouteElement extends GemRouteElement {}

@customElement('dy-light-route')
export class DuoyunLightRouteElement extends GemLightRouteElement {}
