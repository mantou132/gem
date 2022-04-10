import { adoptedStyle, customElement } from '@mantou/gem/lib/decorators';
import { GemElement, html } from '@mantou/gem/lib/element';
import { createCSSSheet, css } from '@mantou/gem/lib/utils';

import { theme } from '../lib/theme';
import { getDisplayKey } from '../lib/hotkeys';
import { throttle } from '../lib/utils';

import './paragraph';

const style = createCSSSheet(css`
  :host {
    display: contents;
  }
  .container,
  .circle {
    position: fixed;
    z-index: calc(${theme.popupZIndex} + 1);
    pointer-events: none;
  }
  .container {
    font-size: 4em;
    left: 0;
    right: 0;
    bottom: 2em;
    text-align: center;
    white-space: nowrap;
    background: rgba(0, 0, 0, calc(${theme.maskAlpha} + 0.4));
  }
  .kbd {
    background: transparent;
    color: white;
  }
  .circle {
    border: 2px solid red;
    border-radius: 10em;
    width: 2.5em;
    aspect-ratio: 1;
    transform: translate(-50%, -50%);
  }
`);

type State = {
  keys: string[];
  mousePosition: number[] | null;
};

/**
 * @customElement dy-input-capture
 */
@customElement('dy-input-capture')
@adoptedStyle(style)
export class DuoyunInputCaptureElement extends GemElement<State> {
  state: State = {
    keys: [],
    mousePosition: null,
  };

  #onClear = throttle(() => {
    this.setState({ keys: [] });
  }, 1000);

  #onKeydown = (evt: KeyboardEvent) => {
    this.setState({ keys: [...this.state.keys, getDisplayKey(evt.code)] });
    this.#onClear();
  };

  #onPointerdown = (evt: PointerEvent) => this.setState({ mousePosition: [evt.clientX, evt.clientY] });
  #onPointermove = (evt: PointerEvent) => this.state.mousePosition && this.#onPointerdown(evt);
  #onPointerup = () => this.setState({ mousePosition: null });

  mounted = () => {
    addEventListener('keydown', this.#onKeydown, { capture: true });
    addEventListener('pointerdown', this.#onPointerdown, { capture: true });
    addEventListener('pointermove', this.#onPointermove, { capture: true });
    addEventListener('pointerup', this.#onPointerup, { capture: true });
    addEventListener('pointercancel', this.#onPointerup, { capture: true });
    () => {
      removeEventListener('keydown', this.#onKeydown, { capture: true });
      removeEventListener('pointerdown', this.#onPointerdown, { capture: true });
      removeEventListener('pointermove', this.#onPointermove, { capture: true });
      removeEventListener('pointerup', this.#onPointerup, { capture: true });
      removeEventListener('pointercancel', this.#onPointerup, { capture: true });
    };
  };

  render = () => {
    const { keys, mousePosition } = this.state;
    return html`
      ${keys.length
        ? html`<dy-paragraph class="container">${keys.map((key) => html`<kbd class="kbd">${key}</kbd>`)}</dy-paragraph>`
        : ''}
      ${mousePosition
        ? html`
            <div class="circle">
              <style>
                .circle {
                  left: ${mousePosition[0]}px;
                  top: ${mousePosition[1]}px;
                }
              </style>
            </div>
          `
        : ''}
    `;
  };
}
