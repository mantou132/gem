import { adoptedStyle, css, customElement, GemElement, html, mounted, state, template } from '@mantou/gem';

import { server } from '../../decorators';

// CSS 状态由服务端设置，客户端恢复状态后跳过首轮副作用，只能从 SSR 输出中恢复
@customElement('app-css-state')
@adoptedStyle(css`
  :scope:state(open) {
    color: red;
  }
`)
export class DemoCSSStateElement extends GemElement {
  @state open: boolean;

  @server()
  @mounted()
  #open = () => {
    this.open = true;
  };

  @template()
  #render = () => html`content`;
}

export const cssState = () => html`<app-css-state></app-css-state>`;
