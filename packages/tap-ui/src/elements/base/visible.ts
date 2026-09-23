import type { Emitter } from '@mantou/gem/lib/decorators';
import { boolattribute, effect, emitter, numattribute, property, state } from '@mantou/gem/lib/decorators';
import { GemElement } from '@mantou/gem/lib/element';
import { addListener } from '@mantou/gem/lib/utils';

export abstract class VisibleBaseElement extends GemElement {
  visible: boolean;
  show: Emitter;
  hide: Emitter;
  intersectionRoot?: Element | Document;
  intersectionRootMargin?: string;
  trackVisibility?: boolean;
  delay?: number;
}

interface ExtendedIntersectionObserverInit extends IntersectionObserverInit {
  trackVisibility?: boolean;
  delay?: number;
}

interface ExtendedIntersectionObserverEntry extends IntersectionObserverEntry {
  isVisible?: boolean;
}

export function visibilityObserver(ele: VisibleBaseElement) {
  let inViewport = false;
  let nativeTrackVisibility = false;

  const update = () => {
    let visible = !document.hidden && inViewport;
    if (visible && ele.trackVisibility && !nativeTrackVisibility && typeof ele.checkVisibility === 'function') {
      try {
        visible = ele.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
      } catch {
        visible = ele.checkVisibility();
      }
    }
    if (ele.visible !== visible) {
      ele.visible = visible;
      if (visible) {
        ele.show(null);
      } else {
        ele.hide(null);
      }
    }
  };

  const options: ExtendedIntersectionObserverInit = {
    root: ele.intersectionRoot,
    rootMargin: ele.intersectionRootMargin,
    threshold: Number.EPSILON,
  };
  if (ele.trackVisibility) {
    options.trackVisibility = true;
    options.delay = Math.max(100, ele.delay || 0);
  }

  const io = new IntersectionObserver((entries) => {
    const entry = entries.at(-1) as ExtendedIntersectionObserverEntry;
    const isIntersecting = entry.intersectionRatio >= Number.EPSILON;
    if (ele.trackVisibility && 'isVisible' in entry) {
      nativeTrackVisibility = true;
      inViewport = isIntersecting && Boolean(entry.isVisible);
    } else {
      inViewport = isIntersecting;
    }
    update();
  }, options);

  io.observe(ele);
  const unlisten = addListener(document, 'visibilitychange', update);
  return () => {
    io.disconnect();
    unlisten();
  };
}

export class TapVisibleBaseElement extends GemElement implements VisibleBaseElement {
  @emitter show: Emitter;
  @emitter hide: Emitter;

  @state visible: boolean;

  @property intersectionRoot?: Element | Document;
  @property intersectionRootMargin?: string;
  @boolattribute trackVisibility: boolean;
  @numattribute delay: number;

  @effect((i) => [i.intersectionRoot, i.intersectionRootMargin, i.trackVisibility, i.delay])
  #observer = () => visibilityObserver(this);
}
