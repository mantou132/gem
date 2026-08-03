import type { Emitter } from '@mantou/gem/lib/decorators';
import {
  adoptedStyle,
  aria,
  boolattribute,
  customElement,
  emitter,
  numattribute,
  part,
  shadow,
  slot,
} from '@mantou/gem/lib/decorators';
import { createRef, createState, css, GemElement, html } from '@mantou/gem/lib/element';
import { classMap, styleMap } from '@mantou/gem/lib/utils';

import { theme } from '../lib/theme';
import type { PanEventDetail, SwipeEventDetail } from './gesture';

import './gesture';

export type SwipeoutSide = 'start' | 'end';

const style = css`
  :host(:where(:not([hidden]))) {
    display: block;
    position: relative;
    overflow: hidden;
    -webkit-tap-highlight-color: transparent;
  }
  .actions {
    position: absolute;
    inset-block: 0;
    display: flex;
  }
  .actions.start {
    inset-inline-start: 0;
  }
  .actions.end {
    inset-inline-end: 0;
  }
  .actions::slotted(*),
  ::slotted([slot='start']),
  ::slotted([slot='end']) {
    flex-shrink: 0;
    height: 100%;
  }
  .content {
    position: relative;
    z-index: 1;
    min-width: 100%;
    background: ${theme.backgroundColor};
    will-change: transform;
    transition: transform 220ms ${theme.timingFunction};
  }
  .content.dragging {
    transition: none;
  }
`;

let activeSwipeout: TapSwipeoutElement | undefined;

@customElement('tap-swipeout')
@adoptedStyle(style)
@aria({ role: 'group' })
@shadow()
export class TapSwipeoutElement extends GemElement {
  @slot @part static start: string;
  @slot @part static end: string;
  @slot @part static content: string;

  @boolattribute disabled: boolean;
  @numattribute threshold: number;

  @emitter change: Emitter<SwipeoutSide | null>;

  #startRef = createRef<HTMLElement>();
  #endRef = createRef<HTMLElement>();
  #state = createState({ offset: 0, dragging: false, opened: null as SwipeoutSide | null });

  get #threshold() {
    return this.threshold || 0.35;
  }

  #measure = () => ({
    start: this.#startRef.value?.getBoundingClientRect().width || 0,
    end: this.#endRef.value?.getBoundingClientRect().width || 0,
  });

  #settle = (side: SwipeoutSide | null) => {
    const widths = this.#measure();
    const offset = side === 'start' ? widths.start : side === 'end' ? -widths.end : 0;
    if (side) {
      if (activeSwipeout && activeSwipeout !== this) activeSwipeout.close();
      activeSwipeout = this;
    } else if (activeSwipeout === this) {
      activeSwipeout = undefined;
    }
    this.#state({ offset, dragging: false, opened: side });
    this.change(side);
  };

  open = (side: SwipeoutSide = 'end') => {
    if (this.disabled) return;
    const widths = this.#measure();
    if (!widths[side]) return;
    this.#settle(side);
  };

  close = () => this.#settle(null);

  toggle = (side: SwipeoutSide = 'end') => {
    this.#state.opened === side ? this.close() : this.open(side);
  };

  #onPan = (evt: CustomEvent<PanEventDetail>) => {
    if (this.disabled || !evt.detail.x) return;
    const widths = this.#measure();
    const offset = Math.min(widths.start, Math.max(-widths.end, this.#state.offset + evt.detail.x));
    this.#state({ offset, dragging: true });
  };

  #onSwipe = (evt: CustomEvent<SwipeEventDetail>) => {
    if (evt.detail.direction === 'left') this.open('end');
    if (evt.detail.direction === 'right') this.open('start');
  };

  #onPanEnd = () => {
    if (!this.#state.dragging) return;
    const { offset } = this.#state;
    const widths = this.#measure();
    if (offset > widths.start * this.#threshold) this.#settle('start');
    else if (offset < -widths.end * this.#threshold) this.#settle('end');
    else this.#settle(null);
  };

  #onContentClick = (evt: Event) => {
    if (!this.#state.opened) return;
    evt.preventDefault();
    evt.stopPropagation();
    this.close();
  };

  #onActionClick = () => queueMicrotask(this.close);

  render = () => {
    const { offset, dragging, opened } = this.#state;
    return html`
      <div
        ${this.#startRef}
        class="actions start"
        part=${TapSwipeoutElement.start}
        ?inert=${opened !== 'start' && !dragging}
        @click=${this.#onActionClick}
      >
        <slot name=${TapSwipeoutElement.start}></slot>
      </div>
      <div
        ${this.#endRef}
        class="actions end"
        part=${TapSwipeoutElement.end}
        ?inert=${opened !== 'end' && !dragging}
        @click=${this.#onActionClick}
      >
        <slot name=${TapSwipeoutElement.end}></slot>
      </div>
      <tap-gesture
        class=${classMap({ content: true, dragging })}
        part=${TapSwipeoutElement.content}
        touch-action="pan-y"
        style=${styleMap({ transform: `translateX(${offset}px)` })}
        @pan=${this.#onPan}
        @swipe=${this.#onSwipe}
        @end=${this.#onPanEnd}
        @click=${this.#onContentClick}
      >
        <slot></slot>
      </tap-gesture>
    `;
  };
}
