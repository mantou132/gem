import type { Emitter } from '@mantou/gem/lib/decorators';
import { adoptedStyle, aria, customElement, emitter, part, property, shadow } from '@mantou/gem/lib/decorators';
import { createState, css, GemElement, html } from '@mantou/gem/lib/element';

import { focusStyle } from '../lib/styles';
import { theme } from '../lib/theme';

const style = css`
  :host(:where(:not([hidden]))) {
    position: fixed;
    z-index: 3;
    inset-inline-end: max(0.25em, env(safe-area-inset-right, 0px));
    inset-block-start: 50%;
    translate: 0 -50%;
    display: grid;
    grid-auto-rows: minmax(0.8em, 1fr);
    align-items: center;
    max-height: min(70dvh, 30em);
    padding: 0.25em;
    border-radius: ${theme.normalRound};
    color: ${theme.primaryColor};
    font-size: 0.6875em;
    line-height: 1;
    user-select: none;
    touch-action: none;
    -webkit-tap-highlight-color: transparent;
  }
  .item {
    position: relative;
    display: grid;
    place-items: center;
    min-height: 1.2em;
    aspect-ratio: 1;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: transparent;
    color: inherit;
    font: inherit;
    cursor: pointer;
  }
  .bubble {
    position: absolute;
    inset-inline-end: calc(100% + 2em);
    inset-block-start: 50%;
    translate: 0 -50%;
    display: grid;
    place-items: center;
    min-width: 3.5em;
    height: 3.5em;
    box-sizing: border-box;
    padding-inline: 0.5em;
    border-radius: 2em;
    background: ${theme.primaryColor};
    color: ${theme.backgroundColor};
    font-size: 1.25em;
    font-weight: 600;
    pointer-events: none;
  }
  .item:disabled {
    color: ${theme.disabledColor};
    cursor: default;
  }
`;

export interface ListIndexItem<T = string> {
  label: string;
  value?: T;
  target?: string | Element;
  disabled?: boolean;
}

export type ListIndexSource<T = string> = string | ListIndexItem<T>;

@customElement('tap-list-index')
@adoptedStyle(style)
@adoptedStyle(focusStyle)
@aria({ role: 'navigation' })
@shadow()
export class TapListIndexElement<T = string> extends GemElement {
  @part static item: string;
  @part static current: string;
  @part static bubble: string;

  @property items?: ListIndexSource<T>[];
  @property getTarget?: (item: ListIndexItem<T>) => Element | null | undefined;
  @emitter select: Emitter<T | string>;

  #state = createState({ currentIndex: -1, tracking: false });

  #normalize = (item: ListIndexSource<T>): ListIndexItem<T> => (typeof item === 'string' ? { label: item } : item);

  #resolveTarget = (item: ListIndexItem<T>) => {
    const customTarget = this.getTarget?.(item);
    if (customTarget) return customTarget;
    if (item.target instanceof Element) return item.target;
    const selector = item.target || `[data-list-index="${CSS.escape(String(item.value ?? item.label))}"]`;
    const root = this.getRootNode();
    return root instanceof Document || root instanceof ShadowRoot
      ? root.querySelector(selector)
      : document.querySelector(selector);
  };

  #activate = (index: number, behavior: ScrollBehavior = 'auto') => {
    const item = this.items?.[index];
    if (!item) return;
    const normalized = this.#normalize(item);
    if (normalized.disabled || index === this.#state.currentIndex) return;
    this.#state({ currentIndex: index });
    this.select(normalized.value ?? normalized.label);
    this.#resolveTarget(normalized)?.scrollIntoView({ behavior, block: 'start' });
  };

  #activateAt = (clientY: number) => {
    const length = this.items?.length || 0;
    if (!length) return;
    const { top, height } = this.getBoundingClientRect();
    const index = Math.min(length - 1, Math.max(0, Math.floor(((clientY - top) / height) * length)));
    this.#activate(index);
  };

  #onPointerDown = (evt: PointerEvent) => {
    if (evt.isPrimary === false || (evt.pointerType === 'mouse' && evt.button !== 0)) return;
    this.setPointerCapture(evt.pointerId);
    this.#state({ tracking: true, currentIndex: -1 });
    this.#activateAt(evt.clientY);
  };

  #onPointerMove = (evt: PointerEvent) => {
    if (this.#state.tracking && this.hasPointerCapture(evt.pointerId)) this.#activateAt(evt.clientY);
  };

  #onPointerEnd = (evt: PointerEvent) => {
    if (this.hasPointerCapture(evt.pointerId)) this.releasePointerCapture(evt.pointerId);
    this.#state({ tracking: false });
  };

  #onKeyDown = (index: number, evt: KeyboardEvent) => {
    let nextIndex = index;
    if (evt.key === 'ArrowDown' || evt.key === 'ArrowRight') {
      evt.preventDefault();
      nextIndex = Math.min((this.items?.length || 1) - 1, index + 1);
    } else if (evt.key === 'ArrowUp' || evt.key === 'ArrowLeft') {
      evt.preventDefault();
      nextIndex = Math.max(0, index - 1);
    }
    if (nextIndex === index) return;
    this.#activate(nextIndex, 'smooth');
    (
      this.shadowRoot?.querySelectorAll<HTMLButtonElement>('.item')[nextIndex] as HTMLButtonElement | undefined
    )?.focus();
  };

  render = () => html`
    ${this.items?.map((source, index) => {
      const item = this.#normalize(source);
      const current = index === this.#state.currentIndex;
      return html`
        <button
          type="button"
          class="item"
          part=${current ? `${TapListIndexElement.item} ${TapListIndexElement.current}` : TapListIndexElement.item}
          aria-current=${current ? 'true' : 'false'}
          ?disabled=${!!item.disabled}
          @click=${(evt: MouseEvent) => evt.detail === 0 && this.#activate(index, 'smooth')}
          @keydown=${(evt: KeyboardEvent) => this.#onKeyDown(index, evt)}
        >
          ${item.label}
          <span
            v-if=${current && this.#state.tracking}
            class="bubble"
            part=${TapListIndexElement.bubble}
            aria-hidden="true"
          >
            ${item.label}
          </span>
        </button>
      `;
    })}
  `;

  constructor() {
    super();
    this.addEventListener('pointerdown', this.#onPointerDown);
    this.addEventListener('pointermove', this.#onPointerMove);
    this.addEventListener('pointerup', this.#onPointerEnd);
    this.addEventListener('pointercancel', this.#onPointerEnd);
  }
}
