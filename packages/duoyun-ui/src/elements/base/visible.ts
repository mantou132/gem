import type { Emitter } from '@mantou/gem/lib/decorators';
import { effect, emitter, property, state } from '@mantou/gem/lib/decorators';
import { GemElement } from '@mantou/gem/lib/element';

export abstract class VisibleBaseElement extends GemElement {
  visible: boolean;
  show: Emitter;
  hide: Emitter;
  intersectionRoot?: Element | Document;
  intersectionRootMargin?: string;
}

export function visibilityObserver(ele: VisibleBaseElement) {
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
export class DuoyunVisibleBaseElement extends GemElement implements VisibleBaseElement {
  @emitter show: Emitter;
  @emitter hide: Emitter;

  @state visible: boolean;

  @property intersectionRoot?: Element | Document;
  @property intersectionRootMargin?: string;

  @effect((i) => [i.intersectionRoot])
  #observer = () => visibilityObserver(this);
}
