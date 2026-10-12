import { adoptedStyle, createState, css, customElement, GemElement, html, template } from '@mantou/gem';

import { server } from '../../decorators';

const style = css`
  :scope {
    display: block;
    text-align: center;
  }
`;

@customElement('gem-ssr-quote')
@adoptedStyle(style)
export class GemSsrQuoteElement extends GemElement {
  #state = createState({ quote: '' });

  // 服务端执行，客户端恢复状态，不再执行
  @server()
  #load = async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));
    this.#state({ quote: `Quote #${Math.random().toString().slice(2, 8)}` });
  };

  @template()
  #render = () => html`${this.#state.quote || 'Loading...'}`;
}
