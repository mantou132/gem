import {
  adoptedStyle,
  attribute,
  classMap,
  createState,
  css,
  customElement,
  GemElement,
  html,
  shadow,
  template,
} from '@mantou/gem';

import { theme } from '../lib/theme';
import type { CodeFile } from '../lib/types';

const style = css`
  :host {
    display: block;
    margin: 2rem 0;
    border-radius: ${theme.normalRound};
    overflow: hidden;
    background: rgb(from ${theme.textColor} r g b / 0.05);
  }
  .tabs {
    display: flex;
    padding-inline: 0.5em;
    font-size: 0.875em;
    border-bottom: 1px solid ${theme.borderColor};
  }
  .tab {
    all: unset;
    padding: 0.6em 0.75em;
    cursor: pointer;
    color: rgb(from ${theme.textColor} r g b / 0.6);
  }
  .tab:hover,
  .current {
    color: ${theme.primaryColor};
  }
  .current {
    box-shadow: inset 0 -2px currentColor;
  }
  ::slotted(*) {
    margin: 0 !important;
    border-radius: 0 !important;
    background: none !important;
  }
`;

/** 默认显示的文件：`active` 的文件，否则是第一个没有隐藏的文件 */
export function getDefaultFile(files: CodeFile[]) {
  const active = files.findIndex(({ status }) => status === 'active');
  return active >= 0
    ? active
    : Math.max(
        files.findIndex(({ status }) => status !== 'hidden'),
        0,
      );
}

/** 子元素的插槽和 `files` 由服务端渲染 Markdown 时生成 */
@customElement('gbp-code-group')
@adoptedStyle(style)
@shadow()
export class GbpCodeGroupElement extends GemElement {
  /** 代码块的文件名和状态，JSON */
  @attribute files: string;

  #state = createState({ current: -1 });

  @template()
  #content = () => {
    const files: CodeFile[] = JSON.parse(this.files || '[]');
    const current = this.#state.current < 0 ? getDefaultFile(files) : this.#state.current;
    return html`
      <div class="tabs">
        ${files.map(
          ({ filename, status }, index) => html`
            <button
              v-if=${status !== 'hidden'}
              class=${classMap({ tab: true, current: index === current })}
              @click=${() => this.#state({ current: index })}
            >
              ${filename}
            </button>
          `,
        )}
      </div>
      <slot name=${current}></slot>
    `;
  };
}
