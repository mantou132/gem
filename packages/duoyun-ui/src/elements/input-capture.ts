import { adoptedStyle, customElement, mounted, part, shadow } from '@mantou/gem/lib/decorators';
import { css, createState, GemElement, html } from '@mantou/gem/lib/element';
import { addListener } from '@mantou/gem/lib/utils';
import { createDecoratorTheme } from '@mantou/gem/helper/theme';

import { theme } from '../lib/theme';
import { getDisplayKey } from '../lib/hotkeys';
import { throttle } from '../lib/timer';
import { contentsContainer } from '../lib/styles';

import './paragraph';

const elementTheme = createDecoratorTheme({ left: '', top: '' });

const style = css`
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
    left: ${elementTheme.left};
    top: ${elementTheme.top};
  }
`;

type State = {
  keys: string[];
  mousePosition: number[] | null;
};

@customElement('dy-input-capture')
@adoptedStyle(style)
@adoptedStyle(contentsContainer)
@shadow()
export class DuoyunInputCaptureElement extends GemElement {
  @part static container: string;
  @part static kbd: string;

  #state = createState<State>({
    keys: [],
    mousePosition: null,
  });

  #onClear = throttle(() => {
    this.#state({ keys: [] });
  }, 1000);

  #onKeydown = (evt: KeyboardEvent) => {
    this.#state({ keys: [...this.#state.keys.slice(-5), getDisplayKey(evt.code)] });
    this.#onClear();
  };

  #onPointerdown = (evt: PointerEvent) => this.#state({ mousePosition: [evt.clientX, evt.clientY] });
  #onPointermove = (evt: PointerEvent) => this.#state.mousePosition && this.#onPointerdown(evt);
  #onPointerup = () => this.#state({ mousePosition: null });

  @mounted()
  #init = () => {
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

  @elementTheme()
  #theme = () => {
    const { mousePosition } = this.#state;
    return { left: `${mousePosition?.at(0)}px`, top: `${mousePosition?.at(1)}px` };
  };

  render = () => {
    const { keys, mousePosition } = this.#state;
    return html`
      <dy-paragraph v-if=${!!keys.length} part=${DuoyunInputCaptureElement.container} class="container">
        ${keys.map((key) => html`<kbd part=${DuoyunInputCaptureElement.kbd} class="kbd">${key}</kbd>`)}
      </dy-paragraph>
      <div v-if=${!!mousePosition} class="circle"></div>
    `;
  };
}
