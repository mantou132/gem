import { adoptedStyle, customElement, emitter, Emitter, state } from '@mantou/gem/lib/decorators';
import { GemElement, html } from '@mantou/gem/lib/element';
import { createCSSSheet, css, styleMap } from '@mantou/gem/lib/utils';

import { theme } from '../lib/theme';

import './reflect';

const style = createCSSSheet(css`
  :host(:where(:not([hidden]))) {
    display: contents;
  }
`);

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

/**
 * @customElement dy-selection-box
 */
@customElement('dy-selection-box')
@adoptedStyle(style)
export class DuoyunSelectionBoxElement extends GemElement<State> {
  @emitter change: Emitter<SelectionChange>;
  @state select: boolean;

  state: State = {
    rect: {
      left: 0,
      right: 0,
      bottom: 0,
      top: 0,
      width: 0,
      height: 0,
    },
    mode: 'new',
  };

  #getMode = ({ shiftKey, metaKey, ctrlKey }: PointerEvent): SelectionMode => {
    if (!shiftKey && !metaKey && !ctrlKey) return 'new';
    if (shiftKey) return 'append';
    return 'delete';
  };

  #onPointerDown = (evt: PointerEvent) => {
    if (evt.altKey) return;
    document.getSelection()?.removeAllRanges();
    this.select = true;
    this.setState({ start: [evt.x, evt.y], mode: this.#getMode(evt) });
    addEventListener('pointermove', this.#onPointerMove);
    addEventListener('pointerup', this.#onPointerUp);
    addEventListener('pointercancel', this.#onPointerUp);
    addEventListener('contextmenu', this.#onPointerUp);
  };

  #onPointerUp = () => {
    this.select = false;
    this.setState({ start: undefined, stop: undefined });
    removeEventListener('pointermove', this.#onPointerMove);
    removeEventListener('pointerup', this.#onPointerUp);
    removeEventListener('pointercancel', this.#onPointerUp);
    removeEventListener('contextmenu', this.#onPointerUp);
  };

  #onPointerMove = (evt: PointerEvent) => {
    const start = this.state.start!;
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
    this.setState({ stop: [x, y], rect });
    this.change({ rect, mode: this.state.mode });
  };

  mounted = () => {
    const root = this.getRootNode();
    root.addEventListener('pointerdown', this.#onPointerDown);
    return () => {
      root.removeEventListener('pointerdown', this.#onPointerDown);
    };
  };

  render = () => {
    const { start, stop, rect } = this.state;
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
          })}
        ></dy-selection-box-mask>
      </dy-reflect>
    `;
  };
}

const borderWidth = 10;
const maskStyle = createCSSSheet(css`
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
`);

/**
 * @customElement dy-selection-box-mask
 */
@customElement('dy-selection-box-mask')
@adoptedStyle(maskStyle)
export class DuoyunSelectionBoxMaskElement extends GemElement {}
