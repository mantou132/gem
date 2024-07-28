import { adoptedStyle, customElement, part, shadow } from '@mantou/gem/lib/decorators';
import { createCSSSheet, GemElement, html } from '@mantou/gem/lib/element';
import { addListener, css } from '@mantou/gem/lib/utils';

import { theme } from '../lib/theme';
import { getDisplayKey } from '../lib/hotkeys';
import { throttle } from '../lib/timer';
import { contentsContainer } from '../lib/styles';

import './paragraph';

const style = createCSSSheet(css`
  .container,
  .circle {
    position: fixed;
    z-index: calc(${theme.popupZIndex} + 3);
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
    line-height: 2;
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
@adoptedStyle(contentsContainer)
@shadow()
export class DuoyunInputCaptureElement extends GemElement<State> {
  @part static container: string;
  @part static kbd: string;

  state: State = {
    keys: [],
    mousePosition: null,
  };

  #onClear = throttle(() => {
    this.setState({ keys: [] });
  }, 1000);

  #onKeydown = (evt: KeyboardEvent) => {
    this.setState({ keys: [...this.state.keys.slice(-5), getDisplayKey(evt.code)] });
    this.#onClear();
  };

  #onPointerdown = (evt: PointerEvent) => this.setState({ mousePosition: [evt.clientX, evt.clientY] });
  #onPointermove = (evt: PointerEvent) => this.state.mousePosition && this.#onPointerdown(evt);
  #onPointerup = () => this.setState({ mousePosition: null });

  mounted = () => {
    const removeKeydownListener = addListener(window, 'keydown', this.#onKeydown, { capture: true });
    const removePointerdownListener = addListener(window, 'pointerdown', this.#onPointerdown, { capture: true });
    const removePointermoveListener = addListener(window, 'pointermove', this.#onPointermove, { capture: true });
    const removePointerupListener = addListener(window, 'pointerup', this.#onPointerup, { capture: true });
    const removePointercancelListener = addListener(window, 'pointercancel', this.#onPointerup, { capture: true });
    () => {
      removeKeydownListener();
      removePointerdownListener();
      removePointermoveListener();
      removePointerupListener();
      removePointercancelListener();
    };
  };

  render = () => {
    const { keys, mousePosition } = this.state;
    return html`
      ${keys.length
        ? html`
            <dy-paragraph part=${DuoyunInputCaptureElement.container} class="container">
              ${keys.map((key) => html`<kbd part=${DuoyunInputCaptureElement.kbd} class="kbd">${key}</kbd>`)}
            </dy-paragraph>
          `
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
