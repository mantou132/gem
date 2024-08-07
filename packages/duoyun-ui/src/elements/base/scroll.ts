import { adoptedStyle, shadow, state } from '@mantou/gem/lib/decorators';
import { createCSSSheet } from '@mantou/gem/lib/element';
import { css } from '@mantou/gem/lib/utils';

import { DuoyunResizeBaseElement, DuoyunResizeBaseElementOptions } from './resize';

const PIXEL_DEVIATION = 0.1;

const style = createCSSSheet(css`
  :host(:where(:not([hidden]))) {
    display: block;
    overflow: auto;
    scrollbar-width: none;
    overscroll-behavior: contain;
    --mask-width: 1.5em;
    --mask-top: 0;
    --mask-right: 100%;
    --mask-bottom: 100%;
    --mask-left: 0;
    --mask-dir: bottom;
    --mask-start: var(--mask-top);
    --mask-end: var(--mask-bottom);
  }
  :host(:state(top-overflow)) {
    --mask-top: var(--mask-width);
  }
  :host(:state(bottom-overflow)) {
    --mask-bottom: calc(100% - var(--mask-width));
  }
  :host(:where(:state(left-overflow), :state(right-overflow))) {
    --mask-dir: right;
    --mask-start: var(--mask-left);
    --mask-end: var(--mask-right);
  }
  :host(:state(left-overflow)) {
    --mask-left: var(--mask-width);
  }
  :host(:state(right-overflow)) {
    --mask-right: calc(100% - var(--mask-width));
  }
  :host(:where(:state(top-overflow), :state(bottom-overflow), :state(left-overflow), :state(right-overflow))) {
    --m: linear-gradient(to var(--mask-dir), #fff0, #000 var(--mask-start), #000 var(--mask-end), #fff0 100%);
    -webkit-mask-image: var(--m);
    mask-image: var(--m);
  }
`);

@adoptedStyle(style)
@shadow()
export class DuoyunScrollBaseElement<_T = Record<string, unknown>> extends DuoyunResizeBaseElement {
  @state topOverflow: boolean;
  @state rightOverflow: boolean;
  @state bottomOverflow: boolean;
  @state leftOverflow: boolean;

  constructor(options?: DuoyunResizeBaseElementOptions) {
    super(options);
    this.addEventListener('scroll', this.#check);
    this.addEventListener('scrollend', this.#check);
    new MutationObserver(this.#check).observe(this, {
      subtree: true,
      childList: true,
    });
    this.effect(() => {
      this.#check();
    });
  }

  #check = () => {
    const contentHeight = this.clientHeight - (this.borderBoxSize.blockSize - this.contentRect.height);
    const contentWidth = this.clientWidth - (this.borderBoxSize.inlineSize - this.contentRect.width);
    const scrollHeight = this.scrollHeight;
    const scrollWidth = this.scrollWidth;
    const scrollTop = this.scrollTop;
    const scrollBottom = scrollHeight - contentHeight - scrollTop;
    const scrollLeft = this.scrollLeft;
    const scrollRight = scrollWidth - contentWidth - scrollLeft;
    this.topOverflow = scrollTop > PIXEL_DEVIATION;
    this.rightOverflow = scrollRight > PIXEL_DEVIATION;
    this.bottomOverflow = scrollBottom > PIXEL_DEVIATION;
    this.leftOverflow = scrollLeft > PIXEL_DEVIATION;
  };
}
