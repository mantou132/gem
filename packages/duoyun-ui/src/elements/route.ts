import { GemRouteElement, GemLightRouteElement } from '@mantou/gem/elements/base/route';
import { customElement } from '@mantou/gem/lib/decorators';

// esm.sh bug: import('https://esm.sh/duoyun-ui/elements/button')
// export * from '@mantou/gem/elements/base/route';
export {
  GemLightRouteElement,
  GemRouteElement,
  createHistoryParams,
  createPath,
  matchPath,
} from '@mantou/gem/elements/base/route';
export type { RouteItem, RouteOptions, RoutesObject } from '@mantou/gem/elements/base/route';

/**
 * @customElement dy-route
 */
@customElement('dy-route')
export class DuoyunRouteElement extends GemRouteElement {}

/**
 * @customElement dy-light-route
 */
@customElement('dy-light-route')
export class DuoyunLightRouteElement extends GemLightRouteElement {}
