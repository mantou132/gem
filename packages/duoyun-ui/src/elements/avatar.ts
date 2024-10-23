import {
  adoptedStyle,
  customElement,
  attribute,
  property,
  boolattribute,
  numattribute,
  part,
  aria,
  shadow,
} from '@mantou/gem/lib/decorators';
import { createCSSSheet, GemElement, html } from '@mantou/gem/lib/element';
import { css, exportPartsMap } from '@mantou/gem/lib/utils';
import { createDecoratorTheme } from '@mantou/gem/helper/theme';

import { theme } from '../lib/theme';

import type { Status } from './status-light';
import { getStatusColor } from './status-light';
import './tooltip';

const elementTheme = createDecoratorTheme({ color: '' });

const style = createCSSSheet(css`
  :host(:where(:not([hidden]))) {
    cursor: default;
    display: inline-block;
    position: relative;
    width: 2.4em;
    aspect-ratio: 1;
    --offset: 14.645%;
    --radius: 100em;
    --size: 0.6em;
    --mask: calc(var(--size) / 2 + 0.07em);
  }
  :host([square]) {
    --offset: 0%;
    --radius: ${theme.smallRound};
  }
  :host([size='small']) {
    width: 1.6em;
  }
  :host([size='large']) {
    width: 3.8em;
  }
  .img {
    display: block;
    width: 100%;
    aspect-ratio: 1;
    border-radius: var(--radius);
    object-fit: cover;
    background: ${theme.hoverBackgroundColor};
    box-sizing: border-box;
  }
  .img::before {
    content: '';
    position: absolute;
    inset: 0;
    background-color: inherit;
  }
  :host([status]:not([status=''])) .img {
    --m: radial-gradient(
      circle at calc(100% - var(--offset)) var(--offset),
      #0000 var(--mask),
      #fff calc(var(--mask) + 0.5px)
    );
    mask-image: var(--m);
  }
  .status {
    position: absolute;
    top: var(--offset);
    right: var(--offset);
    width: var(--size);
    border-radius: 10em;
    aspect-ratio: 1;
    transform: translate(50%, -50%);
    background-color: ${elementTheme.color};
  }
`);

/**
 * @customElement dy-avatar
 * @attr src
 * @attr alt
 * @attr status
 * @attr background
 * @attr tooltip
 * @attr size
 * @attr square
 * @attr crossorigin
 */
@customElement('dy-avatar')
@adoptedStyle(style)
@shadow()
export class DuoyunAvatarElement extends GemElement {
  @part static avatar: string;
  @attribute src: string;
  @attribute alt: string;
  @attribute status: Status;
  @attribute tooltip: string;
  @attribute size: 'small' | 'medium' | 'large';
  @attribute crossorigin: 'anonymous' | 'use-credentials';
  @boolattribute square: boolean;

  @elementTheme()
  #theme = () => ({ color: getStatusColor(this.status) || 'inherit' });

  render = () => {
    return html`
      <dy-tooltip .content=${this.tooltip}>
        <img
          class="img"
          alt=${this.alt || this.src}
          src=${this.src}
          part=${DuoyunAvatarElement.avatar}
          crossorigin=${this.crossorigin}
        />
      </dy-tooltip>
      ${this.status ? html`<div class="status"></div>` : ''}
    `;
  };
}

const groupStyle = createCSSSheet(css`
  :scope:where(:not([hidden])) {
    display: flex;
  }
  .item:not(:first-child) {
    margin-inline-start: -0.4em;
  }
  .item {
    --gap: 0.4em;
    --gradient: #0000 37%, #fff calc(37% + 0.5px);
    --m-left: radial-gradient(circle at calc(-50% + var(--gap)) center, var(--gradient));
    --m-right: radial-gradient(circle at calc(150% - var(--gap)) center, var(--gradient));
    --m: none;
    mask-image: var(--m);
    mask-composite: intersect;
  }
  .item:not(:last-child, :hover) {
    --m: var(--m-right);
  }
  .item:hover + .item {
    --m: var(--m-left), var(--m-right);
  }
  .item:hover + .item:last-child {
    --m: var(--m-left);
  }
`);

export type AvatarItem = {
  src?: string;
  alt?: string;
  status?: Status;
  tooltip?: string;
  square?: boolean;
  onClick?: (evt: Event) => void;
};

/**
 * @customElement dy-avatar-group
 */
@customElement('dy-avatar-group')
@adoptedStyle(groupStyle)
@aria({ role: 'list' })
export class DuoyunAvatarGroupElement extends GemElement {
  @part static avatar: string;

  @numattribute max: number;
  @attribute size: 'small' | 'medium' | 'large';
  @attribute crossorigin: 'anonymous' | 'use-credentials';

  /**@deprecated */
  @property data?: AvatarItem[];
  @property items?: AvatarItem[];

  get #items() {
    return this.items || this.data;
  }

  get #max() {
    return this.max || this.#items?.length || 0;
  }

  #parts = exportPartsMap({ [DuoyunAvatarElement.avatar]: DuoyunAvatarGroupElement.avatar });

  #renderAvatar = ({ src = '', tooltip = '', alt = '', status, onClick }: AvatarItem) => {
    return html`
      <dy-avatar
        exportparts=${this.#parts}
        class="item"
        role="listitem"
        .src=${src}
        .tooltip=${tooltip}
        .alt=${alt}
        .status=${status as Status}
        size=${this.size}
        crossorigin=${this.crossorigin}
        @click=${onClick}
      ></dy-avatar>
    `;
  };

  render = () => {
    if (!this.#items) return html``;
    const rest = this.#items.slice(this.#max);
    return html`
      ${this.#items.slice(0, this.#max).map((avatar) => this.#renderAvatar(avatar))}
      ${rest.length
        ? html`
            <dy-avatar
              exportparts=${DuoyunAvatarElement.avatar}
              class="item"
              role="listitem"
              .tooltip=${rest.map((e) => e.alt).join()}
            >
              +${rest.length}
            </dy-avatar>
          `
        : ''}
    `;
  };
}
