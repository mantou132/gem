import { GemElement, GemElementOptions } from '@mantou/gem/lib/element';

import { debounce } from '../../lib/utils';

export class DuoyunResizeBaseElement<_T = Record<string, unknown>> extends GemElement {
  constructor(options: GemElementOptions & { debounce?: boolean } = {}) {
    super(options);
    const { debounce: needDebounce = true } = options;
    const callback = ([entry]: ResizeObserverEntry[]) => {
      this.contentRect = entry.contentRect;
      this.borderBoxSize = entry.borderBoxSize?.[0]
        ? entry.borderBoxSize[0]
        : { blockSize: this.contentRect.height, inlineSize: this.contentRect.width };
      this.update();
    };
    const debounceCallback = needDebounce ? debounce(callback) : callback;
    this.effect(
      () => {
        const ro = new ResizeObserver(debounceCallback);
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
