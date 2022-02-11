import { GemElement, html } from '@mantou/gem/lib/element';
import { adoptedStyle, customElement, property, numattribute, refobject, RefObject } from '@mantou/gem/lib/decorators';
import { createCSSSheet, css, styleMap, classMap } from '@mantou/gem/lib/utils';

import { theme } from '../lib/theme';
import { icons } from '../lib/icons';
import { commonHandle } from '../lib/hotkeys';
import { focusStyle } from '../lib/styles';

import type { SwipeEventDetail } from './gesture';
import type { DouyunLinkElement } from './link';

import './gesture';
import './use';
import './link';
import './heading';
import './paragraph';
import './button';

const style = createCSSSheet(css`
  :host {
    display: block;
    position: relative;
    color: ${theme.highlightColor};
  }
  * {
    cursor: pointer;
  }
  .list li {
    display: contents;
  }
  .item {
    position: relative;
    display: block;
    aspect-ratio: 20 / 7;
    overflow: hidden;
  }
  [inert] {
    display: none;
  }
  .img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    --m: linear-gradient(to right top, transparent, black 35%);
    -webkit-mask-image: var(--m);
    mask-image: var(--m);
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
    opacity: 0;
    animation-duration: 1.3s;
  }
  .img,
  .content {
    animation: fadein ${theme.timingEasingFunction} 0.667s both;
  }
  @keyframes fadein {
    0% {
      transform: translateX(calc(var(--direction) * 3em));
    }
    100% {
      transform: translateX(0);
      opacity: 1;
    }
  }
  .tag {
    font-style: italic;
    background: yellow;
    padding: 0.2em 0.3em;
    margin-block-end: 0.5em;
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
    bottom: 0;
    display: flex;
    justify-content: center;
    margin-block: 1em;
  }
  .circle {
    width: 0.5em;
    padding: 0.2em;
  }
  .circle::before {
    transform: scale(0.99);
    content: '';
    color: ${theme.primaryColor};
    display: block;
    aspect-ratio: 1;
    border: 1px solid;
    border-radius: 10em;
  }
  .circle:where(:hover)::before {
    background: ${theme.describeColor};
  }
  .current::before {
    background: currentColor;
  }
`);

type Item = {
  link: string;
  img: string;
  background?: string;
  tag?: string;
  title: string;
  description: string;
  actionText?: string;
};

type State = {
  currentIndex: number;
  direction: 1 | -1;
};

/**
 * @customElement dy-carousel
 */
@customElement('dy-carousel')
@adoptedStyle(style)
@adoptedStyle(focusStyle)
export class DuoyunCarouselElement extends GemElement<State> {
  @numattribute interval: number;
  @refobject currentLinkRef: RefObject<DouyunLinkElement>;

  @property data?: Item[];

  get #interval() {
    return this.interval || 3000;
  }

  state: State = {
    currentIndex: 0,
    direction: 1,
  };

  #add = (direction: 1 | -1) => {
    const total = this.data!.length;
    this.setState({ currentIndex: (total + this.state.currentIndex + direction) % total, direction });
  };

  #jump = (index: number) => {
    this.#clearTimer();
    this.#next();
    this.setState({ currentIndex: index, direction: 1 });
  };

  #onSwipe = ({ detail }: CustomEvent<SwipeEventDetail>) => {
    this.#clickDisabled = true;
    setTimeout(() => (this.#clickDisabled = false));
    this.#clearTimer();
    this.#next();

    switch (detail.direction) {
      case 'left':
        return this.#add(1);
      case 'right':
        return this.#add(-1);
    }
  };

  #timer = 0;
  #clickDisabled = false;

  #next = () => {
    this.#timer = window.setTimeout(() => {
      this.#add(1);
      this.#next();
    }, this.#interval);
  };

  #clearTimer = () => clearTimeout(this.#timer);

  #goLink = () => {
    if (this.#clickDisabled) return;
    this.currentLinkRef.element?.click();
  };

  #pagevisibleChange = () => {
    if (document.visibilityState === 'visible') {
      this.#next();
    } else {
      this.#clearTimer();
    }
  };

  mounted = () => {
    this.#next();
    document.addEventListener('visibilitychange', this.#pagevisibleChange);
    return () => {
      document.removeEventListener('visibilitychange', this.#pagevisibleChange);
      this.#clearTimer();
    };
  };

  render = () => {
    const { currentIndex, direction } = this.state;
    return html`
      <dy-gesture @click=${this.#goLink} @swipe=${this.#onSwipe}>
        <ul class="list" role="region">
          ${this.data?.map(
            ({ img, background, link, title, description, actionText, tag }, index) => html`
              <li>
                <dy-link
                  class="item"
                  ref=${currentIndex === index ? this.currentLinkRef.ref : ''}
                  href=${link}
                  style=${styleMap({ background, '--direction': `${direction}` } as any)}
                  ?inert=${currentIndex !== index}
                  @click=${(evt: Event) => evt.stopPropagation()}
                >
                  <img class="img" alt=${title} src=${img} />
                  <div class="content">
                    ${tag ? html`<div class="tag">${tag}</div>` : ''}
                    <dy-heading class="heading" lv="2">${title}</dy-heading>
                    <dy-paragraph class="paragraph">${description}</dy-paragraph>
                    ${actionText
                      ? html`
                          <dy-button class="action">
                            ${actionText}
                            <dy-use class="forward" .element=${icons.forward}></dy-use>
                          </dy-button>
                        `
                      : ''}
                  </div>
                </dy-link>
              </li>
            `,
          )}
        </ul>
      </dy-gesture>
      <div class="nav">
        ${this.data?.map(
          (_, index) =>
            html`
              <div
                tabindex="0"
                role="button"
                @keydown=${commonHandle}
                @click=${() => this.#jump(index)}
                class=${classMap({ circle: true, current: index === currentIndex })}
              ></div>
            `,
        )}
      </div>
    `;
  };
}
