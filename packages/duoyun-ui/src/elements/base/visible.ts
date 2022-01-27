import { emitter, Emitter, state } from '@mantou/gem/lib/decorators';
import { GemElement, GemElementOptions } from '@mantou/gem/lib/element';

/**
 * @fires visible
 * @fires hide
 */
export class DuoyunVisibleBaseElement<_T = Record<string, unknown>> extends GemElement {
  @emitter visible: Emitter;
  @emitter hide: Emitter;

  @state visibility: boolean;

  constructor(options?: GemElementOptions) {
    super(options);
    new IntersectionObserver((entries) => {
      const { intersectionRatio } = entries.pop()!;
      if (intersectionRatio > 0) {
        this.visibility = true;
        this.visible(null);
      } else {
        this.visibility = false;
        this.hide(null);
      }
    }).observe(this);
  }
}
