import { GemLightRouteElement, GemRouteElement } from '@mantou/gem/elements/base/route';
import { customElement } from '@mantou/gem/lib/decorators';

export type { RouteItem, RouteOptions, RoutesObject } from '@mantou/gem/elements/base/route';
export {
  createHistoryParams,
  createPath,
  GemLightRouteElement,
  GemRouteElement,
  matchPath,
} from '@mantou/gem/elements/base/route';

@customElement('tap-route')
export class TapRouteElement extends GemRouteElement {}

@customElement('tap-light-route')
export class TapLightRouteElement extends GemLightRouteElement {}
