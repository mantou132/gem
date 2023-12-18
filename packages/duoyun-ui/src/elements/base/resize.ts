import { emitter, Emitter } from '@mantou/gem/lib/decorators';
import { GemElement, GemElementOptions } from '@mantou/gem/lib/element';

import { throttle } from '../../lib/utils';

export class DuoyunResizeBaseElement<_T = Record<string, unknown>> extends GemElement {
  @emitter resize: Emitter<DuoyunResizeBaseElement>;

  constructor(options: GemElementOptions & { throttle?: boolean } = {}) {
    super(options);
    const { throttle: needThrottle = true } = options;
    const callback = (entryList: ResizeObserverEntry[]) => {
      entryList.forEach((entry) => {
        this.contentRect = entry.contentRect;
        this.borderBoxSize = entry.borderBoxSize?.[0]
          ? entry.borderBoxSize[0]
          : { blockSize: this.contentRect.height, inlineSize: this.contentRect.width };
        this.update();
        this.resize(this);
      });
    };
    const throttleCallback = needThrottle ? throttle(callback, 300, { leading: true }) : callback;
    this.effect(
      () => {
        const ro = new ResizeObserver(throttleCallback);
        ro.observe(this, {});
        return () => ro.disconnect();
      },
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
