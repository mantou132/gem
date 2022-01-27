import { adoptedStyle, state } from '@mantou/gem/lib/decorators';
import { GemElementOptions } from '@mantou/gem/lib/element';
import { createCSSSheet, css } from '@mantou/gem/lib/utils';

import { DuoyunResizeBaseElement } from './resize';

const style = createCSSSheet(css`
  :host {
    display: block;
    --mask-width: 1.5em;
    --mask-top: 0;
    --mask-right: 100%;
    --mask-bottom: 100%;
    --mask-left: 0;
    --mask-dir: bottom;
    --mask-start: var(--mask-top);
    --mask-end: var(--mask-bottom);
  }
  :host(:where(:--top-overflow, [data-topoverflow])) {
    --mask-top: var(--mask-width);
  }
  :host(:where(:--bottom-overflow, [data-bottomoverflow])) {
    --mask-bottom: calc(100% - var(--mask-width));
  }
  :host(:where(:--left-overflow, [data-leftoverflow], :--right-overflow, [data-rightoverflow])) {
    --mask-dir: right;
    --mask-start: var(--mask-left);
    --mask-end: var(--mask-right);
  }
  :host(:where(:--left-overflow, [data-leftoverflow])) {
    --mask-left: var(--mask-width);
  }
  :host(:where(:--right-overflow, [data-rightoverflow])) {
    --mask-right: calc(100% - var(--mask-width));
  }
  :host(:where(:--top-overflow, [data-topoverflow], :--bottom-overflow, [data-bottomoverflow], :--left-overflow, [data-leftoverflow], :--right-overflow, [data-rightoverflow])) {
    --m: linear-gradient(to var(--mask-dir), #fff0, #000 var(--mask-start), #000 var(--mask-end), #fff0 100%);
    -webkit-mask-image: var(--m);
    mask-image: var(--m);
  }
`);

@adoptedStyle(style)
export class DuoyunScrollBaseElement<_T = Record<string, unknown>> extends DuoyunResizeBaseElement {
  @state topOverflow: boolean;
  @state rightOverflow: boolean;
  @state bottomOverflow: boolean;
  @state leftOverflow: boolean;

  constructor(options?: GemElementOptions) {
    super(options);
    this.addEventListener('scroll', this.#check);
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
    this.topOverflow = scrollTop > 0.1;
    this.rightOverflow = scrollRight > 0.1;
    this.bottomOverflow = scrollBottom > 0.1;
    this.leftOverflow = scrollLeft > 0.1;
  };
}
