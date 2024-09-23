import type { TemplateResult } from '@mantou/gem/lib/element';
import { createCSSSheet, createState, GemElement, html } from '@mantou/gem/lib/element';
import type { Emitter } from '@mantou/gem/lib/decorators';
import {
  adoptedStyle,
  customElement,
  property,
  numattribute,
  attribute,
  part,
  emitter,
  shadow,
  memo,
  mounted,
  effect,
} from '@mantou/gem/lib/decorators';
import { css, styleMap, classMap, addListener } from '@mantou/gem/lib/utils';
import { createDecoratorTheme } from '@mantou/gem/helper/theme';

import { theme } from '../lib/theme';
import { icons } from '../lib/icons';
import { commonHandle } from '../lib/hotkeys';
import { focusStyle } from '../lib/styles';

import './use';
import './heading';
import './paragraph';
import './button';
import './more';

const elementTheme = createDecoratorTheme({ bgImg: '' });

const style = createCSSSheet(css`
  :host(:where(:not([hidden]))) {
    display: block;
    width: 100%;
    aspect-ratio: 20 / 7;
    position: relative;
    color: ${theme.highlightColor};
    /** use prevImg */
    background-size: cover;
    background-position: center;
    background-image: ${elementTheme.bgImg};
  }
  .list,
  .item,
  .img {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
  }
  .item {
    list-style: none;
    position: relative;
    overflow: hidden;
  }
  [inert] {
    display: none;
  }
  .img {
    position: absolute;
    object-fit: cover;
  }
  .content {
    position: absolute;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    inset: 0;
    padding-inline: 4em;
    max-width: 35%;
    animation-duration: 1.3s;
  }
  .img,
  .content {
    animation: fadeIn ${theme.timingEasingFunction} 0.667s both;
  }
  .paused :where(.img, .content) {
    animation-play-state: paused;
    animation-direction: reverse;
  }
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateX(calc(var(--step) * 3em));
    }
  }
  .tag {
    font-style: italic;
    padding: 0.2em 0.3em;
    margin-block-end: 0.5em;
    background: yellow;
    color: black;
  }
  .heading {
    margin-block-start: 0;
  }
  .item,
  .heading,
  .paragraph {
    color: inherit;
  }
  .action {
    font-weight: bold;
  }
  .forward {
    width: 1.2em;
  }
  .nav {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0.5em;
    display: flex;
    justify-content: center;
  }
  .circle {
    width: 1em;
    height: 0.3em;
    border-radius: 10em;
    padding: 0.3em;
    background-clip: content-box;
    background-color: currentColor;
    opacity: 0.3;
    transition: width 0.2s;
  }
  .circle:where(:hover) {
    opacity: 0.6;
  }
  .circle.current {
    width: 1.5em;
    opacity: 1;
  }
`);

export type CarouselItem = {
  img: string;
  background?: string;
  onClick?: (evt: PointerEvent) => void;
  tag?: string | TemplateResult;
  title?: string;
  description?: string;
  action?: {
    text: string;
    handle?: () => void;
  };
};

enum Direction {
  Left,
  Right,
}

/**
 * @customElement dy-carousel
 */
@customElement('dy-carousel')
@adoptedStyle(style)
@adoptedStyle(focusStyle)
@shadow({ delegatesFocus: true })
export class DuoyunCarouselElement extends GemElement {
  @part static img: string;
  @part static title: string;
  @part static tag: string;
  @part static content: string;
  @part static button: string;
  @part static description: string;
  @part static nav: string;

  @attribute crossorigin: 'anonymous' | 'use-credentials';
  @numattribute interval: number;
  @emitter change: Emitter<number>;

  /**@deprecated */
  @property data?: CarouselItem[];
  @property items?: CarouselItem[];

  get #items() {
    return this.items || this.data;
  }

  get #interval() {
    return this.interval || 3000;
  }

  #state = createState({
    currentIndex: 0,
    direction: Direction.Right,
  });

  get #step() {
    return this.#state.direction === Direction.Right ? 1 : -1;
  }

  #add = (direction: Direction) => {
    const total = this.#items?.length;
    if (!total) return;
    this.#state({ currentIndex: (total + this.#state.currentIndex + this.#step) % total, direction });
    this.#reset();
  };

  #timer = 0;
  #isFirstRender = true;
  #waitLeave = Promise.resolve();

  #reset = () => {
    this.#clearTimer();
    this.#timer = window.setTimeout(async () => {
      await this.#waitLeave;
      this.#add(Direction.Right);
    }, this.#interval);
  };

  #oMouseEnter = (evt: Event) => {
    this.#waitLeave = new Promise((res) =>
      evt.target?.addEventListener('mouseleave', () => res(), {
        once: true,
      }),
    );
  };

  #clearTimer = () => clearTimeout(this.#timer);

  #pageVisibleChange = () => {
    if (document.visibilityState === 'visible') {
      this.#reset();
    } else {
      this.#clearTimer();
    }
  };

  #prevImg?: string;

  @memo((i) => [i.#state.currentIndex])
  #updateImg = (_: number[], oldDeps?: number[]) => {
    if (oldDeps) {
      this.#prevImg = this.#items?.[oldDeps[0]]?.img;
      this.#isFirstRender = false;
    }
  };

  @mounted()
  #init = () => {
    this.#reset();
    const removeListener = addListener(document, 'visibilitychange', this.#pageVisibleChange);
    return () => {
      removeListener();
      this.#clearTimer();
    };
  };

  @effect((i) => [i.#state.currentIndex])
  #emitterEvent = () => this.change(this.#state.currentIndex);

  @elementTheme()
  #theme = () => ({ bgImg: this.#prevImg ? `url(${this.#prevImg})` : 'none' });

  render = () => {
    const { currentIndex } = this.#state;

    return html`
      <ul class="list" role="region">
        ${this.#items?.map(
          ({ img, title, background, description, action, tag, onClick }, index) => html`
            <li
              class=${classMap({ item: true, paused: this.#isFirstRender })}
              style=${styleMap({ '--step': `${this.#step}` })}
              .inert=${currentIndex !== index}
              @click=${onClick}
            >
              <img
                part=${DuoyunCarouselElement.img}
                class="img"
                style=${styleMap({ background })}
                alt=${title || ''}
                src=${img}
                crossorigin=${this.crossorigin}
              />
              <div class="content" part=${DuoyunCarouselElement.content} @mouseenter=${this.#oMouseEnter}>
                ${tag ? html`<div part=${DuoyunCarouselElement.tag} class="tag">${tag}</div>` : ''}
                <dy-heading part=${DuoyunCarouselElement.title} class="heading" lv="2">${title}</dy-heading>
                <dy-more expandless>
                  <dy-paragraph part=${DuoyunCarouselElement.description} class="paragraph">
                    ${description}
                  </dy-paragraph>
                </dy-more>
                ${action
                  ? html`
                      <dy-button
                        class="action"
                        part=${DuoyunCarouselElement.button}
                        @click=${(evt: Event) => {
                          if (action.handle) {
                            evt.stopPropagation();
                            action.handle();
                          }
                        }}
                      >
                        ${action.text}
                        <dy-use class="forward" .element=${icons.forward}></dy-use>
                      </dy-button>
                    `
                  : ''}
              </div>
            </li>
          `,
        )}
      </ul>
      <div part=${DuoyunCarouselElement.nav} class="nav">
        ${this.#items?.map(
          (_, index) => html`
            <div
              tabindex="0"
              role="button"
              @keydown=${commonHandle}
              @click=${() => this.jump(index)}
              class=${classMap({ circle: true, current: index === currentIndex })}
            ></div>
          `,
        )}
      </div>
    `;
  };

  next = () => {
    this.#add(Direction.Right);
  };

  prev = () => {
    this.#add(Direction.Left);
  };

  jump = (index: number) => {
    this.#state({
      currentIndex: index,
      direction: index > this.#state.currentIndex ? Direction.Right : Direction.Left,
    });
    this.#reset();
  };
}
