import {
  adoptedStyle,
  aria,
  classMap,
  createState,
  css,
  customElement,
  effect,
  GemElement,
  html,
  mounted,
  property,
  shadow,
  template,
} from '@mantou/gem';

import { i18n } from '$gemkit/i18n';
import { theme } from '../lib/theme';
import type { Heading } from '../lib/types';

import '@mantou/gem/elements/link';

const style = css`
  :host {
    display: block;
    font-size: 0.875rem;
  }
  .title {
    margin: 0 0 0.75em;
    font-weight: bold;
  }
  ul {
    margin: 0;
    padding: 0;
    list-style: none;
    border-inline-start: 1px solid ${theme.borderColor};
  }
  gem-link {
    display: block;
    padding: 0.25em 0 0.25em 1em;
    margin-inline-start: -1px;
    color: rgb(from ${theme.textColor} r g b / 0.7);
    text-decoration: none;
    border-inline-start: 1px solid transparent;
  }
  gem-link:not(.current):hover {
    color: ${theme.textColor};
  }
  .level-3 {
    padding-inline-start: 2em;
  }
  .current {
    color: ${theme.primaryColor};
    border-color: currentColor;
  }
`;

/** 当前标题：最后一个滚动到页面顶部附近的标题 */
const OFFSET = 100;

/** 页面目录，滚动时高亮当前标题 */
@customElement('gem-book-toc')
@adoptedStyle(style)
@shadow()
@aria({ role: 'navigation' })
export class GemBookTocElement extends GemElement {
  @property headings: Heading[] = [];

  #state = createState({ current: '' });

  #updateCurrent = () => {
    const elements = this.headings.flatMap(({ id }) => document.getElementById(id) || []);
    const current = elements.findLast((ele) => ele.getBoundingClientRect().top < OFFSET) || elements[0];
    if (current && current.id !== this.#state.current) this.#state({ current: current.id });
  };

  // `<gem-link>` 只更新地址的 hash，滚动到标题需要自己处理
  // 默认是第一个标题，服务端渲染时也一样
  get #current() {
    return this.#state.current || this.headings[0]?.id;
  }

  #onClick = (id: string) => {
    document.getElementById(id)?.scrollIntoView();
    this.#state({ current: id });
  };

  @effect((i) => [i.headings])
  #init = () => this.#updateCurrent();

  @mounted()
  #listen = () => {
    addEventListener('scroll', this.#updateCurrent, { passive: true });
    return () => removeEventListener('scroll', this.#updateCurrent);
  };

  @template()
  #content = () => html`
    <p class="title">${i18n.get('toc')}</p>
    <ul>
      ${this.headings.map(
        ({ id, text, level }) => html`
          <li>
            <gem-link
              class=${classMap({ [`level-${level}`]: true, current: id === this.#current })}
              hash=${`#${id}`}
              @click=${() => this.#onClick(id)}
            >
              ${text}
            </gem-link>
          </li>
        `,
      )}
    </ul>
  `;
}
