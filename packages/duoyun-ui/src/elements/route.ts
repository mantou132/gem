import { GemRouteElement, GemLightRouteElement } from '@mantou/gem/elements/base/route';
import { customElement } from '@mantou/gem/lib/decorators';

export * from '@mantou/gem/elements/base/route';

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
