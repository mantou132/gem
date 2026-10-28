import { css } from '@mantou/gem';
import { mediaQuery } from '@mantou/gem/helper/mediaquery';

import { primaryTextColor, theme } from './theme';

/** 外部链接的图标，和 `icons.link` 一样 */
const LINK_ICON = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M18.8,85.1h56c2.2,0,4-1.8,4-4v-32h-8v28h-48v-48h28v-8h-32c-2.2,0-4,1.8-4,4v56C14.8,83.3,16.6,85.1,18.8,85.1z"/><polygon points="45.7,48.7 51.3,54.3 77.2,28.5 77.2,37.2 85.2,37.2 85.2,14.9 62.8,14.9 62.8,22.9 71.5,22.9"/></svg>',
)}")`;

/** 服务端渲染的 Markdown 内容的样式 */
export const markdownStyle = css`
  .markdown {
    overflow-wrap: break-word;

    > :first-child {
      margin-top: 0;
    }
    :where(h1, h2, h3, h4, h5, h6) {
      font-weight: 600;
      line-height: 1.3;
      letter-spacing: -0.01em;
      scroll-margin-top: calc(${theme.headerHeight} + 2rem);
    }
    h1 {
      font-size: 2.25rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      margin: 0 0 1.5rem;
    }
    /* 章节之间使用分隔线 */
    h2 {
      font-size: 1.5rem;
      margin: 3rem 0 1rem;
      padding-top: 1.5rem;
      border-top: 1px solid ${theme.borderColor};
    }
    h3 {
      font-size: 1.25rem;
      margin: 2rem 0 0.75rem;
    }
    :where(h4, h5, h6) {
      font-size: 1.1rem;
      margin: 2rem 0 1rem;
    }
    .anchor {
      margin-inline-start: 0.25em;
      font-weight: normal;
      color: ${primaryTextColor};
      text-decoration: none;
      opacity: 0;
    }
    .anchor::before {
      content: '#';
    }
    :is(h1, h2, h3, h4, h5, h6):hover .anchor,
    .anchor:focus-visible {
      opacity: 1;
    }
    p {
      margin: 1rem 0;
    }
    :where(ul, ol) {
      padding-inline-start: 1.25rem;
    }
    li > p:first-child {
      margin: 0;
    }
    img {
      max-width: 100%;
      border-radius: ${theme.normalRound};
    }
    hr {
      height: 1px;
      margin: 3rem 0;
      border: 0;
      background: ${theme.borderColor};
    }
    .link {
      font-weight: 500;
      color: ${primaryTextColor};
      text-decoration: none;
      &:hover {
        text-decoration: underline;
      }
      &[target='_blank']::after {
        content: '';
        display: inline-block;
        width: 0.8em;
        height: 0.8em;
        margin-inline-start: 0.15em;
        background: currentColor;
        mask: ${LINK_ICON} center / contain no-repeat;
      }
    }
    :not(pre) > code {
      font: 0.875em ${theme.codeFont};
      padding: 0.15em 0.4em;
      color: ${primaryTextColor};
      background: rgb(from ${theme.primaryColor} r g b / 0.1);
      border-radius: ${theme.smallRound};
    }
    kbd {
      font: 0.875em ${theme.codeFont};
      padding: 0.1em 0.4em;
      border: 1px solid ${theme.borderColor};
      border-bottom-width: 2px;
      border-radius: ${theme.smallRound};
    }
    details {
      margin: 2rem 0;
      padding: 1rem;
      border-radius: ${theme.normalRound};
      background: rgb(from ${theme.noteColor} r g b / 0.05);
    }
    @media print {
      details::details-content {
        display: block;
      }
    }
    summary {
      display: flex;
      align-items: center;
      gap: 0.5em;
      font-weight: bold;
      cursor: pointer;
      list-style: none;
    }
    summary::-webkit-details-marker {
      display: none;
    }
    summary::before {
      content: '';
      width: 0.35em;
      height: 0.35em;
      margin-inline: 0.15em 0.1em;
      border: solid currentColor;
      border-width: 0 1.5px 1.5px 0;
      opacity: 0.5;
      transform: rotate(-45deg);
      transition: transform 0.2s;
    }
    details[open] > summary::before {
      transform: rotate(45deg);
    }
    blockquote {
      --highlight: ${theme.textColor};
      margin: 2rem 0;
      padding: 0.75rem 1rem;
      border-inline-start: 0.25rem solid rgb(from var(--highlight) r g b / 0.2);
      color: rgb(from ${theme.textColor} r g b / 0.8);
      break-inside: avoid;
      /* 提示块 */
      &:is(.note, .tip, .important, .warning, .caution) {
        padding: 1rem 1.25rem;
        border: none;
        border-radius: ${theme.normalRound};
        color: inherit;
        background: rgb(from var(--highlight) r g b / 0.08);
      }
      &.note {
        --highlight: ${theme.noteColor};
      }
      &.tip {
        --highlight: ${theme.tipColor};
      }
      &.important {
        --highlight: ${theme.importantColor};
      }
      &.warning {
        --highlight: ${theme.warningColor};
      }
      &.caution {
        --highlight: ${theme.cautionColor};
      }
      > .title {
        font-size: 0.875em;
        font-weight: 600;
        letter-spacing: 0.02em;
        color: var(--highlight);
      }
      > p {
        margin: 0.5rem 0 0;
      }
      > :first-child {
        margin-top: 0;
      }
    }
    .table-wrap {
      margin: 2rem 0;
      max-width: 100%;
      width: max-content;
      overflow: auto;
      border: 1px solid ${theme.borderColor};
      border-radius: ${theme.normalRound};
    }
    table {
      min-width: 100%;
      border-collapse: collapse;
    }
    :where(td, th) {
      padding: 0.6em 1em;
      &:not(:last-child) {
        border-inline-end: 1px solid ${theme.borderColor};
      }
      &:not([align]) {
        text-align: start;
      }
    }
    tr:not(:last-child) {
      border-bottom: 1px solid ${theme.borderColor};
    }
    thead {
      background: rgb(from ${theme.textColor} r g b / 0.05);
    }
    th {
      font-weight: normal;
    }
    /* 可以编辑的代码，例如 <gbp-sandpack> 中，\`<gem-book-code>\` 高亮光标所在的行，不需要焦点框 */
    gem-book-code pre[contenteditable] {
      outline: none;
    }
    /* 代码块中省略的行 */
    .gap {
      color: rgb(from ${theme.textColor} r g b / 0.4);
      user-select: none;
    }
    :where(.media) {
      display: block;
      max-width: 100%;
      margin: 2rem 0;
      border-radius: ${theme.normalRound};
    }
    iframe {
      width: 100%;
      height: max(35em, 60vh);
      box-sizing: border-box;
      border: 1px solid ${theme.borderColor};
      border-radius: ${theme.normalRound};
    }
    @media ${mediaQuery.PHONE} {
      h1 {
        font-size: 2rem;
      }
      .anchor {
        opacity: 1;
      }
    }
  }

  /* 服务端高亮的代码 https://highlightjs.org/ */
  :where(.hljs-comment, .hljs-quote) {
    color: var(--code-comment-color, light-dark(#6e6e6e, #8b949e));
    font-style: italic;
  }
  :where(.hljs-punctuation) {
    color: var(--code-title-color, light-dark(#4646c6, #a5b4fc));
  }
  :where(.hljs-tag, .hljs-name, .hljs-property, .hljs-symbol, .hljs-deletion, .hljs-operator, .hljs-meta) {
    color: var(--code-section-color, light-dark(#c9252d, #7ee787));
  }
  :where(.hljs-variable, .hljs-template-variable, .hljs-link) {
    color: var(--code-variable-color, light-dark(#ae0e66, #ffa657));
  }
  :where(.hljs-number, .hljs-literal) {
    color: var(--code-literal-color, light-dark(#6f38b1, #79c0ff));
  }
  :where(.hljs-string, .hljs-regexp, .hljs-built_in, .hljs-addition) {
    color: var(--code-string-color, light-dark(#12805c, #a5d6ff));
  }
  :where(.hljs-title, .hljs-type, .hljs-section) {
    color: var(--code-function-color, light-dark(#0d66d0, #d2a8ff));
  }
  :where(.hljs-keyword, .hljs-selector-tag) {
    color: var(--code-keyword-color, light-dark(#93219e, #ff7b72));
  }
  :where(.hljs-attr, .hljs-attribute, .hljs-selector-class, .hljs-selector-id, .hljs-selector-attr) {
    color: var(--code-attribute-color, light-dark(#4646c6, #a5b4fc));
  }
  :where(.hljs-strong) {
    font-weight: bold;
  }
  :where(.hljs-emphasis) {
    font-style: italic;
  }
`;
