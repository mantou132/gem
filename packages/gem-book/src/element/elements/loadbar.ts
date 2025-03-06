import { aria, customElement, shadow, GemElement, html, css, adoptedStyle, createState, mounted } from '@mantou/gem';
import { createDecoratorTheme } from '@mantou/gem/helper/theme';

import { theme } from '../helper/theme';

const elementTheme = createDecoratorTheme({ progress: '' });

const styles = css`
  :host {
    z-index: 22222222;
    position: fixed;
    display: flex;
    justify-content: flex-end;
    align-items: flex-end;
    top: 0;
    left: 0;
    height: 2px;
    transition: width 0.3s;
    background-color: ${theme.primaryColor};
    width: ${elementTheme.progress};
  }
  .head {
    width: 300px;
    height: 400%;
    background-color: inherit;
    border-start-start-radius: 50%;
    border-end-start-radius: 50%;
    filter: drop-shadow(0 0 4px ${theme.primaryColor});
  }
`;

@customElement('gem-book-loadbar')
@aria({ role: 'progressbar' })
@adoptedStyle(styles)
@shadow()
export class GemBookLoadbarElement extends GemElement {
  static instance?: GemBookLoadbarElement;
  static timer: ReturnType<typeof setTimeout> | number = 0;

  static async start({ delay = 100 }: { delay?: number } = {}) {
    clearInterval(Loadbar.timer);
    Loadbar.timer = setTimeout(() => {
      const instance = Loadbar.instance || new Loadbar();
      instance.#state({ progress: 0 });
      if (!instance.isConnected) document.body.append(instance);
      Loadbar.timer = setInterval(() => {
        instance.#state({ progress: instance.#state.progress + (95 - instance.#state.progress) * 0.1 });
      }, 100);
    }, delay);
  }

  static async end() {
    clearInterval(Loadbar.timer);
    const instance = Loadbar.instance;
    if (instance) {
      instance.#state({ progress: 100 });
      await new Promise((res) => setTimeout(res, 300));
      instance.remove();
    }
  }

  #state = createState({
    progress: 0,
  });

  @mounted()
  #init = () => {
    Loadbar.instance = this;
    return () => (Loadbar.instance = undefined);
  };

  @elementTheme()
  #theme = () => ({ progress: `${this.#state.progress}%` });

  render = () => {
    return html`<div class="head"></div>`;
  };
}

export const Loadbar = GemBookLoadbarElement;
