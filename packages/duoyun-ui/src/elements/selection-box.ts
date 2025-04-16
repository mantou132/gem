import type { Emitter } from '@mantou/gem/lib/decorators';
import { adoptedStyle, customElement, effect, emitter, property, shadow } from '@mantou/gem/lib/decorators';
import { createState, css, GemElement, html } from '@mantou/gem/lib/element';
import { addListener, styleMap } from '@mantou/gem/lib/utils';

import { isInputElement } from '../lib/element';
import { contentsContainer } from '../lib/styles';
import { theme } from '../lib/theme';

import './reflect';

type SelectionMode = 'new' | 'append' | 'delete';

type State = {
  start?: [number, number];
  stop?: [number, number];
  rect: SelectionRect;
  mode: SelectionMode;
};

type SelectionRect = {
  left: number;
  right: number;
  bottom: number;
  top: number;
  width: number;
  height: number;
};

export type SelectionChange = {
  rect: SelectionRect;
  mode: SelectionMode;
};

@customElement('dy-selection-box')
@adoptedStyle(contentsContainer)
@shadow()
export class DuoyunSelectionBoxElement extends GemElement {
  @property container?: HTMLElement;

  @emitter change: Emitter<SelectionChange>;

  get #container() {
    return this.container || ((this.getRootNode() as ShadowRoot).host as HTMLElement | undefined) || document.body;
  }

  #state = createState<State>({
    rect: {
      left: 0,
      right: 0,
      bottom: 0,
      top: 0,
      width: 0,
      height: 0,
    },
    mode: 'new',
  });

  #getMode = ({ shiftKey, metaKey, ctrlKey }: PointerEvent): SelectionMode => {
    if (!shiftKey && !metaKey && !ctrlKey) return 'new';
    if (shiftKey) return 'append';
    return 'delete';
  };

  #getCursor = () => {
    switch (this.#state.mode) {
      case 'append':
        return 'copy';
      case 'delete':
        return 'crosshair';
      default:
        return 'cell';
    }
  };

  #restoreContainerStyle: () => void;

  #onPointerDown = (evt: PointerEvent) => {
    if (evt.altKey) return;
    const target = evt.composedPath()[0];
    if (target instanceof HTMLElement && isInputElement(target)) return;
    document.getSelection()?.removeAllRanges();
    const container = this.#container;
    const containerStyle = container.getAttribute('style');
    this.#restoreContainerStyle = () =>
      containerStyle ? container.setAttribute('style', containerStyle) : container.removeAttribute('style');
    container.style.userSelect = 'none';
    this.#state({ start: [evt.x, evt.y], mode: this.#getMode(evt) });
    addEventListener('pointermove', this.#onPointerMove);
    addEventListener('pointerup', this.#onPointerUp);
    addEventListener('pointercancel', this.#onPointerUp);
    addEventListener('contextmenu', this.#onPointerUp);
  };

  #onPointerUp = () => {
    this.#restoreContainerStyle();
    this.#state({ start: undefined, stop: undefined });
    removeEventListener('pointermove', this.#onPointerMove);
    removeEventListener('pointerup', this.#onPointerUp);
    removeEventListener('pointercancel', this.#onPointerUp);
    removeEventListener('contextmenu', this.#onPointerUp);
  };

  #onPointerMove = (evt: PointerEvent) => {
    const start = this.#state.start!;
    const x = evt.x === start[0] ? evt.x + 0.01 : evt.x;
    const y = evt.y === start[1] ? evt.y + 0.01 : evt.y;
    const rect: SelectionRect = {
      left: Math.min(start[0], x),
      right: Math.max(start[0], x),
      top: Math.min(start[1], y),
      bottom: Math.max(start[1], y),
      width: Math.abs(start[0] - x),
      height: Math.abs(start[1] - y),
    };
    if (Math.sqrt(rect.width ** 2 + rect.height ** 2) < 4) return;
    this.#state({ stop: [x, y], rect });
    this.change({ rect, mode: this.#state.mode });
  };

  @effect((i) => [i.container])
  #init = () => addListener(this.#container, 'pointerdown', this.#onPointerDown);

  render = () => {
    const { start, stop, rect } = this.#state;
    if (!start || !stop) return html``;

    const { left, top, width, height } = rect;

    return html`
      <dy-reflect .target=${document.body}>
        <dy-selection-box-mask
          style=${styleMap({
            left: left + 'px',
            top: top + 'px',
            width: width + 'px',
            height: height + 'px',
            cursor: this.#getCursor(),
          })}
        ></dy-selection-box-mask>
      </dy-reflect>
    `;
  };
}

const borderWidth = 100;
const maskStyle = css`
  :host {
    position: fixed;
    border: ${borderWidth}px solid transparent;
    transform: translate(-${borderWidth}px, -${borderWidth}px);
  }
  :host::after,
  :host::before {
    content: '';
    display: block;
    position: absolute;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
  }
  :host::before {
    opacity: 0.4;
    background: ${theme.informativeColor};
  }
  :host::after {
    border: 1px solid ${theme.informativeColor};
  }
`;

@customElement('dy-selection-box-mask')
@adoptedStyle(maskStyle)
@shadow()
export class DuoyunSelectionBoxMaskElement extends GemElement {}
