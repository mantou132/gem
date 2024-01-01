import { GemElement, html, customElement, connectStore, classMap, useStore } from '@mantou/gem';

import { theme, themeStore } from '../helper/theme';

import '@mantou/gem/elements/link';

export const [tocStore, updateTocStore] = useStore({
  elements: [] as HTMLHeadingElement[],
});

type State = {
  current?: Element;
};

/**
 * @customElement gem-book-toc
 */
@customElement('gem-book-toc')
@connectStore(tocStore)
export class GemBookTocElement extends GemElement<State> {
  state: State = {};

  #getLevel = (h: HTMLHeadingElement) => Number(h.tagName.slice(1)) - 2;

  #callback = ({ intersectionRatio, rootBounds, boundingClientRect, target }: IntersectionObserverEntry) => {
    const isTop =
      Math.abs(boundingClientRect.top - (rootBounds?.top || 0)) <
      Math.abs((rootBounds?.bottom || innerHeight) - boundingClientRect.bottom);
    if (isTop) {
      if (intersectionRatio === 1) {
        // 上方进入
        this.setState({ current: target });
      }
    } else {
      if (intersectionRatio === 1) {
        // 下方进入
        this.setState({ current: target });
      }
      if (intersectionRatio === 0) {
        // 下方离开
        if (this.state.current === target) {
          this.setState({
            current: tocStore.elements.find((_, index, arr) => arr.at(index + 1) === target),
          });
        }
      }
    }
  };

  #setCurrent = (current: Element) => setTimeout(() => this.setState({ current }), 100);

  mounted = () => {
    const io = new IntersectionObserver((entryList) => entryList.forEach(this.#callback), {
      rootMargin: `-${themeStore.headerHeight} 0px 0px`,
      threshold: [0, 1],
    });
    this.effect(
      () => tocStore.elements.forEach((e) => io.observe(e)),
      () => [tocStore.elements],
    );

    return () => io.disconnect();
  };

  render = () => {
    if (!tocStore.elements.length) return html``;
    return html`
      <style>
        :host {
          font-size: 0.875rem;
          padding: 2rem 1.5rem;
          box-sizing: border-box;
          height: min-content;
          position: sticky;
          top: ${theme.headerHeight};
        }
        h2 {
          font-weight: bold;
          font-size: 0.875em;
          opacity: 0.6;
          margin: 0 0 1em;
        }
        ul,
        li {
          display: contents;
        }
        gem-link {
          display: block;
          text-decoration: none;
          color: inherit;
          opacity: 0.8;
          line-height: 1.5;
          margin-block: 0.5em;
        }
        gem-link:hover {
          opacity: 0.6;
        }
        gem-link.current {
          opacity: 1;
          color: ${theme.primaryColor};
        }
      </style>
      <h2>CONTENTS</h2>
      <ul>
        ${tocStore.elements.map(
          (h) => html`
            <li>
              <gem-link
                class=${classMap({ current: h === this.state.current })}
                @click=${() => this.#setCurrent(h)}
                hash=${`#${h.id}`}
                style="padding-inline-start:${this.#getLevel(h)}em"
                >${h.textContent}</gem-link
              >
            </li>
          `,
        )}
      </ul>
    `;
  };
}
