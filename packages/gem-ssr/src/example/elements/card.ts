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

  #handle = () => {
    this.#state({ count: ++this.#state.count });
  };

  @mounted()
  #mounted = () => {
    this.addEventListener('click', this.#handle);
  };

  render = () => {
    return html`
      <div class="header" data-count=${`${this.#state.count}`}>
        <span>${html`<i>${this.header}</i>`}: ${this.#state.count}</span>
        <gem-link v-if=${!!(this.#state.count % 3)}>Action</gem-link>
      </div>
      <div class="body" @click=${this.#handle}>
        <slot>${html`<div></div><div></div>`}<div></div>
        </slot>
      </div>
    `;
  };
}
