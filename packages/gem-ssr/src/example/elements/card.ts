import {
  adoptedStyle,
  attribute,
  createState,
  css,
  customElement,
  GemElement,
  html,
  mounted,
  shadow,
} from '@mantou/gem';

import '@mantou/gem/elements/link';

const style = css`
  :host {
    user-select: none;
    display: block;
    border: 1px solid #666;
    width: 300px;
    cursor: default;
  }
  .header,
  .body {
    padding: 1em;
  }
  .header {
    display: flex;
    justify-content: space-between;
    border-bottom: 1px solid #999;
  }
`;

@customElement('gem-ssr-card')
@adoptedStyle(style)
@shadow()
export class GemSsrCardElement extends GemElement {
  @attribute header: string;

  #state = createState({ count: 1 });

  @mounted()
  #mounted = () => {
    this.addEventListener('click', () => {
      this.#state({ count: ++this.#state.count });
    });
  };

  render = () => {
    return html`
      <div class="header">
        <span>${this.header}: ${this.#state.count}</span>
        <gem-link>Action</gem-link>
      </div>
      <div class="body">
        <slot></slot>
      </div>
    `;
  };
}
