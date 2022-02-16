import { adoptedStyle, customElement } from '@mantou/gem/lib/decorators';
import { GemElement, html } from '@mantou/gem/lib/element';
import { createCSSSheet, css } from '@mantou/gem/lib/utils';

import { theme } from '../lib/theme';
import { sleep } from '../lib/utils';

const style = createCSSSheet(css`
  :host {
    z-index: ${theme.popupZIndex};
    position: fixed;
    display: flex;
    justify-content: flex-end;
    align-items: flex-end;
    top: 0;
    left: 0;
    height: 2px;
    transition: width 0.3s;
    background-color: ${theme.informativeColor};
  }
  .head {
    width: 300px;
    height: 400%;
    background-color: inherit;
    border-start-start-radius: 50%;
    border-end-start-radius: 50%;
    filter: drop-shadow(0 0 4px ${theme.informativeColor});
  }
`);

/**
 * @customElement dy-page-loadbar
 */
@customElement('dy-page-loadbar')
@adoptedStyle(style)
export class DuoyunPageLoadbarElement extends GemElement {
  static instance?: DuoyunPageLoadbarElement;
  static timer = 0;

  static async start({ delay = 100 }: { delay?: number } = {}) {
    clearInterval(Loadbar.timer);
    Loadbar.timer = window.setTimeout(() => {
      const instance = Loadbar.instance || new Loadbar();
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
      await sleep(300);
      instance.remove();
    }
  }

  constructor() {
    super();
    document.body.append(this);
    this.internals.role = 'progressbar';
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
