import { emitter, Emitter } from '@mantou/gem/lib/decorators';
import { GemElement, GemElementOptions } from '@mantou/gem/lib/element';

import { throttle } from '../../lib/utils';

export function resizeObserver(ele: DuoyunResizeBaseElement, options: { throttle?: boolean } = {}) {
  const { throttle: needThrottle = true } = options;
  const callback = (entryList: ResizeObserverEntry[]) => {
    entryList.forEach((entry) => {
      ele.contentRect = entry.contentRect;
      ele.borderBoxSize = entry.borderBoxSize?.[0]
        ? entry.borderBoxSize[0]
        : { blockSize: ele.contentRect.height, inlineSize: ele.contentRect.width };
      ele.update();
      ele.resize(ele);
    });
  };
  const throttleCallback = needThrottle ? throttle(callback, 300, { leading: true }) : callback;
  const ro = new ResizeObserver(throttleCallback);
  ro.observe(ele, {});
  return () => ro.disconnect();
}

export class DuoyunResizeBaseElement<_T = Record<string, unknown>> extends GemElement {
  @emitter resize: Emitter<DuoyunResizeBaseElement>;

  constructor(options: GemElementOptions & { throttle?: boolean } = {}) {
    super(options);
    this.effect(
      () => resizeObserver(this, options),
      () => [],
    );
  }

  borderBoxSize = {
    blockSize: 0,
    inlineSize: 0,
  };

  contentRect = {
    height: 0,
    width: 0,
  };
}
