import {
  adoptedStyle,
  attribute,
  boolattribute,
  createState,
  css,
  customElement,
  effect,
  GemElement,
  html,
  shadow,
  styleMap,
  template,
} from '@mantou/gem';

import { i18n } from '$gemkit/i18n';
import { icons } from '../lib/icons';
import { theme } from '../lib/theme';

const LINE_HEIGHT = 1.6;

const HIGHLIGHT_COLOR = `rgb(from ${theme.textColor} r g b / 0.07)`;

const style = css`
  :host {
    display: block;
    position: relative;
    margin: 2rem 0;
    font: 0.875em / ${LINE_HEIGHT} ${theme.codeFont};
    background: rgb(from ${theme.textColor} r g b / 0.05);
    border-radius: ${theme.normalRound};
    overflow: hidden;
  }
  .filename {
    padding: 0.75em 1.25em;
    font-size: 0.875em;
    line-height: 1;
    border-bottom: 1px solid ${theme.borderColor};
    color: rgb(from ${theme.textColor} r g b / 0.6);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .body {
    position: relative;
    display: flex;
    height: 100%;
  }
  .linenumbers {
    flex-shrink: 0;
    padding: 1em 0.75em;
    min-width: 2em;
    text-align: end;
    color: rgb(from ${theme.textColor} r g b / 0.4);
    border-inline-end: 1px solid ${theme.borderColor};
    user-select: none;
    span {
      display: block;
      height: ${LINE_HEIGHT}em;
    }
  }
  ::slotted(pre) {
    outline: none;
    flex-grow: 1;
    min-width: 0;
    margin: 0 !important;
    padding: 1em 1.25em !important;
    overflow: auto;
    font: inherit !important;
    tab-size: 2;
  }
  /* 编辑时高亮光标所在的行，随代码滚动 */
  ::slotted(pre[contenteditable]:focus) {
    background: linear-gradient(${HIGHLIGHT_COLOR}, ${HIGHLIGHT_COLOR}) 0
      calc(1em + (var(--current-line) - 1) * ${LINE_HEIGHT}em) / 100% ${LINE_HEIGHT}em no-repeat local !important;
  }
  .highlight {
    position: absolute;
    inset-inline: 0;
    height: ${LINE_HEIGHT}em;
    pointer-events: none;
    background: ${HIGHLIGHT_COLOR};
  }
  .copy {
    all: unset;
    position: absolute;
    top: 0.5em;
    right: 0.5em;
    display: flex;
    padding: 0.4em;
    border-radius: ${theme.smallRound};
    cursor: pointer;
    color: rgb(from ${theme.textColor} r g b / 0.6);
    background: ${theme.backgroundColor};
    opacity: 0;
    transition: opacity 0.2s;
  }
  :host(:hover) .copy,
  .copy:focus-visible {
    opacity: 1;
  }
  .copy svg {
    width: 1.2em;
    height: 1.2em;
  }
  @media print {
    .copy,
    /* 编辑时高亮光标所在的行，随代码滚动 */
  ::slotted(pre[contenteditable]:focus) {
    background: linear-gradient(${HIGHLIGHT_COLOR}, ${HIGHLIGHT_COLOR}) 0
      calc(1em + (var(--current-line) - 1) * ${LINE_HEIGHT}em) / 100% ${LINE_HEIGHT}em no-repeat local !important;
  }
  .highlight {
      display: none;
    }
  }
`;

/** `1,3-5` => `[1, 3, 4, 5]` */
const parseLines = (s: string) =>
  s
    .split(',')
    .filter(Boolean)
    .flatMap((range) => {
      const [start, end = start] = range.split('-').map(Number);
      return Array.from({ length: end - start + 1 }, (_, i) => start + i);
    });

/**
 * 代码块，代码由服务端高亮，作为子元素 `<pre><code>`
 */
@customElement('gem-book-code')
@adoptedStyle(style)
@shadow()
export class GemBookCodeElement extends GemElement {
  @attribute lang: string;
  @attribute filename: string;
  /** 代码组中的状态：`active` 默认显示，`hidden` 不显示 */
  @attribute status: string;
  /** 高亮的行，例如 `1,3-5` */
  @attribute highlight: string;
  /** 每一行的行号，空表示省略的行，例如 `2,3,,7,8` */
  @attribute linenumbers: string;
  /** 不显示文件名，例如在代码组中 */
  @boolattribute headless: boolean;
  /** 可以编辑代码，例如在 `<gbp-sandpack>` 中，编辑时触发 `input` 事件 */
  @boolattribute editable: boolean;

  #state = createState({ copied: false, currentLine: 1 });

  /** 当前的代码，不包括省略的行 */
  get code() {
    return (this.textContent || '')
      .split('\n')
      .filter((line) => line !== '⋯')
      .join('\n');
  }

  #copy = async () => {
    await navigator.clipboard.writeText(this.code);
    this.#state({ copied: true });
    setTimeout(() => this.#state({ copied: false }), 1000);
  };

  /** 光标所在的行，从 1 开始 */
  #updateCurrentLine = () => {
    const pre = this.querySelector('pre');
    const selection = getSelection();
    if (!pre || !selection?.focusNode || !pre.contains(selection.focusNode)) return;
    const range = document.createRange();
    range.setStart(pre, 0);
    range.setEnd(selection.focusNode, selection.focusOffset);
    this.#state({ currentLine: range.toString().split('\n').length });
  };

  // 在 `<pre>` 上编辑，点击行尾的空白处也能定位到该行
  @effect((i) => [i.editable])
  #setEditable = () => {
    const pre = this.querySelector('pre');
    if (!pre || !this.editable) return;
    pre.contentEditable = 'plaintext-only';
    pre.spellcheck = false;
    document.addEventListener('selectionchange', this.#updateCurrentLine);
    return () => {
      pre.removeAttribute('contenteditable');
      pre.removeAttribute('spellcheck');
      document.removeEventListener('selectionchange', this.#updateCurrentLine);
    };
  };

  @template()
  #content = () => html`
    <div v-if=${!this.headless && !!this.filename} class="filename">${this.filename}</div>
    <div class="body" style=${styleMap({ '--current-line': String(this.#state.currentLine) })}>
      ${parseLines(this.highlight).map(
        (line) =>
          html`<span class="highlight" style=${styleMap({ top: `calc(1em + ${(line - 1) * LINE_HEIGHT}em)` })}></span>`,
      )}
      <div v-if=${!!this.linenumbers} class="linenumbers" aria-hidden="true">
        ${this.linenumbers.split(',').map((line) => html`<span>${line}</span>`)}
      </div>
      <slot></slot>
      <button class="copy" aria-label=${i18n.get('copy')} @click=${this.#copy}>
        ${this.#state.copied ? icons.check : icons.copy}
      </button>
    </div>
  `;
}
