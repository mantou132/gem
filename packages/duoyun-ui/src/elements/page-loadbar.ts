import { adoptedStyle, aria, customElement, shadow } from '@mantou/gem/lib/decorators';
import { GemElement, html, createCSSSheet } from '@mantou/gem/lib/element';
import { css } from '@mantou/gem/lib/utils';

import { theme } from '../lib/theme';
import { sleep } from '../lib/timer';

const style = createCSSSheet(css`
  :host(:where(:not([hidden]))) {
    view-transition-name: dy-page-loadbar;
    z-index: ${theme.popupZIndex};
    position: fixed;
    display: flex;
    justify-content: flex-end;
    align-items: flex-end;
    top: env(titlebar-area-height, var(--titlebar-area-height, 0px));
    left: 0;
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
`);

/**
 * @customElement dy-page-loadbar
 */
@customElement('dy-page-loadbar')
@adoptedStyle(style)
@aria({ role: 'progressbar' })
@shadow()
export class DuoyunPageLoadbarElement extends GemElement {
  static instance?: DuoyunPageLoadbarElement;
  static timer = 0;

  /**在延时时间内结束将不会显示加载条 */
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
    // 能同时取消 setTimeout ID
    clearInterval(Loadbar.timer);
    const instance = Loadbar.instance;
    if (instance) {
      instance.setState({ progress: 100 });
      await sleep(300);
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
          width: ${this.state.progress}%;
        }
      </style>
      <div class="head"></div>
    `;
  };
}

export const Loadbar = DuoyunPageLoadbarElement;
