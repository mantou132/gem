import { emitter, Emitter, property, state } from '@mantou/gem/lib/decorators';
import { GemElement } from '@mantou/gem/lib/element';

export function visibilityObserver(ele: DuoyunVisibleBaseElement) {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach(({ intersectionRatio }) => {
        if (intersectionRatio > 0) {
          ele.visible = true;
          ele.show(null);
        } else {
          ele.visible = false;
          ele.hide(null);
        }
      });
    },
    {
      root: ele.intersectionRoot,
      rootMargin: ele.intersectionRootMargin,
    },
  );
  io.observe(ele);
  return () => io.disconnect();
}

/**
 * @fires show
 * @fires hide
 */
export class DuoyunVisibleBaseElement<_T = Record<string, unknown>> extends GemElement {
  @emitter show: Emitter;
  @emitter hide: Emitter;

  @state visible: boolean;

  @property intersectionRoot?: Element | Document;
  @property intersectionRootMargin?: string;

  constructor() {
    super();
    this.effect(
      () => visibilityObserver(this),
      () => [this.intersectionRoot],
    );
  }
}
