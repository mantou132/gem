import { emitter, Emitter } from '@mantou/gem/lib/decorators';
import { GemElement, GemElementOptions } from '@mantou/gem/lib/element';

import { throttle } from '../../lib/utils';

export type ResizeDetail = {
  contentRect: DuoyunResizeBaseElement['contentRect'];
  borderBoxSize: DuoyunResizeBaseElement['borderBoxSize'];
};

export function resizeObserver(ele: DuoyunResizeBaseElement, options: { throttle?: boolean } = {}) {
  const { throttle: needThrottle = true } = options;
  const callback = (entryList: ResizeObserverEntry[]) => {
    entryList.forEach((entry) => {
      const oldDetail = { contentRect: ele.contentRect, borderBoxSize: ele.borderBoxSize };
      const { x, y, width, height } = entry.contentRect;
      // 只支持一个
      // https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserverEntry/borderBoxSize
      const { blockSize, inlineSize } = entry.borderBoxSize[0];
      ele.contentRect = { x, y, width, height };
      ele.borderBoxSize = { blockSize, inlineSize };
      ele.update();
      ele.resize(oldDetail);
    });
  };
  const throttleCallback = needThrottle ? throttle(callback, 300, { leading: true }) : callback;
  const ro = new ResizeObserver(throttleCallback);
  ro.observe(ele, {});
  return () => ro.disconnect();
}

export type DuoyunResizeBaseElementOptions = GemElementOptions & { throttle?: boolean };
export class DuoyunResizeBaseElement<_T = Record<string, unknown>> extends GemElement {
  @emitter resize: Emitter<ResizeDetail>;

  constructor(options: DuoyunResizeBaseElementOptions = {}) {
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
    x: 0,
    y: 0,
    height: 0,
    width: 0,
  };
}
