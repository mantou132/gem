import { effect, emitter, Emitter, property } from '@mantou/gem/lib/decorators';
import { GemElement } from '@mantou/gem/lib/element';

import { throttle } from '../../lib/timer';

export type ResizeDetail = {
  contentRect: DuoyunResizeBaseElement['contentRect'];
  borderBoxSize: DuoyunResizeBaseElement['borderBoxSize'];
};

export function resizeObserver(ele: DuoyunResizeBaseElement) {
  const { resizeThrottle = true } = ele;
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
  const throttleCallback = resizeThrottle ? throttle(callback, 300, { leading: true }) : callback;
  const ro = new ResizeObserver(throttleCallback);
  ro.observe(ele, {});
  return () => ro.disconnect();
}

export class DuoyunResizeBaseElement extends GemElement {
  @emitter resize: Emitter<ResizeDetail>;
  @property resizeThrottle?: boolean;

  @effect((i) => [i.resizeThrottle])
  #observer = () => resizeObserver(this);

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
