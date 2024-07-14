import { aria, customElement, shadow, GemElement, html } from '@mantou/gem';

import { theme } from '../helper/theme';

/**
 * @customElement gem-book-loadbar
 */
@customElement('gem-book-loadbar')
@aria({ role: 'progressbar' })
@shadow()
export class GemBookLoadbarElement extends GemElement {
  static instance?: GemBookLoadbarElement;
  static timer = 0;

  static async start({ delay = 100 }: { delay?: number } = {}) {
    clearInterval(Loadbar.timer);
    Loadbar.timer = window.setTimeout(() => {
      const instance = Loadbar.instance || new Loadbar();
      if (!instance.isConnected) document.body.append(instance);
      instance.setState({ progress: 0 });
      Loadbar.timer = window.setInterval(() => {
        instance.setState({ progress: instance.state.progress + (95 - instance.state.progress) * 0.1 });
      }, 100);
    }, delay);
  }

  static async end() {
    clearInterval(Loadbar.timer);
    const instance = Loadbar.instance;
    if (instance) {
      instance.setState({ progress: 100 });
      await new Promise((res) => setTimeout(res, 300));
      instance.remove();
    }
  }

  state = {
    progress: 0,
  };

  mounted = () => {
    Loadbar.instance = this;
    return () => (Loadbar.instance = undefined);
  };

  render = () => {
    return html`
      <style>
        :host {
          z-index: 22222222;
          position: fixed;
          display: flex;
          justify-content: flex-end;
          align-items: flex-end;
          top: 0;
          left: 0;
          width: ${this.state.progress}%;
          height: 2px;
          transition: width 0.3s;
          background-color: ${theme.primaryColor};
        }
        .head {
          width: 300px;
          height: 400%;
          background-color: inherit;
          border-start-start-radius: 50%;
          border-end-start-radius: 50%;
          filter: drop-shadow(0 0 4px ${theme.primaryColor});
        }
      </style>
      <div class="head"></div>
    `;
  };
}

export const Loadbar = GemBookLoadbarElement;
