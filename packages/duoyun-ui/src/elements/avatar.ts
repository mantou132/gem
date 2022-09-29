import {
  adoptedStyle,
  customElement,
  attribute,
  property,
  boolattribute,
  numattribute,
  part,
} from '@mantou/gem/lib/decorators';
import { GemElement, html } from '@mantou/gem/lib/element';
import { createCSSSheet, css } from '@mantou/gem/lib/utils';

import { theme } from '../lib/theme';

import { Status, getStatusColor } from './status-light';
import './tooltip';

const style = createCSSSheet(css`
  :host {
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
  .content {
    width: 100%;
    aspect-ratio: 1;
    position: absolute;
    inset: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: var(--radius);
    object-fit: cover;
    background: ${theme.hoverBackgroundColor};
    box-sizing: border-box;
  }
  :host([status]:not([status=''])) .content {
    --m: radial-gradient(
      circle at calc(100% - var(--offset)) var(--offset),
      #0000 var(--mask),
      #fff calc(var(--mask) + 0.5px)
    );
    -webkit-mask-image: var(--m);
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
    background-color: var(--status);
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
 */
@customElement('dy-avatar')
@adoptedStyle(style)
export class DuoyunAvatarElement extends GemElement {
  @part static avatar: string;
  @attribute src: string;
  @attribute alt: string;
  @attribute status: Status;
  @attribute tooltip: string;
  @attribute size: 'small' | 'medium' | 'large';
  @attribute crossorigin: 'anonymous' | 'use-credentials';
  @boolattribute square: boolean;

  render = () => {
    const status = getStatusColor(this.status);
    return html`
      <style>
        :host {
          --status: ${status || 'inherit'};
        }
      </style>
      <dy-tooltip .content=${this.tooltip}>
        <div class="content">
          ${this.src &&
          html`
            <img
              class="content"
              alt=${this.alt || this.src}
              src=${this.src}
              part=${DuoyunAvatarElement.avatar}
              crossorigin=${this.crossorigin}
            />
          `}
          <slot></slot>
        </div>
      </dy-tooltip>
      ${this.status ? html`<div class="status"></div>` : ''}
    `;
  };
}

export type Avatar = {
  src?: string;
  alt?: string;
  status?: Status;
  tooltip?: string;
  square?: boolean;
};

const groupStyle = createCSSSheet(css`
  :host {
    display: flex;
  }
  .item:not(:first-child) {
    margin-inline-start: -0.4em;
  }
  .item:not(:last-child) {
    --m: radial-gradient(circle at calc(150% - 0.4em) center, #0000 37%, #fff calc(37% + 0.5px));
    -webkit-mask-image: var(--m);
    mask-image: var(--m);
  }
`);

type AvatarItem = Avatar & { onClick?: (evt: Event) => void };

/**
 * @customElement dy-avatar-group
 */
@customElement('dy-avatar-group')
@adoptedStyle(groupStyle)
export class DuoyunAvatarGroupElement extends GemElement {
  @numattribute max: number;

  @property data?: AvatarItem[];

  get #max() {
    return this.max || this.data?.length || 0;
  }

  constructor() {
    super();
    this.internals.role = 'group';
  }

  #renderAvatar = ({ src = '', tooltip = '', alt = '', status, onClick }: AvatarItem) => {
    return html`
      <dy-avatar
        exportparts=${DuoyunAvatarElement.avatar}
        class="item"
        .src=${src}
        .tooltip=${tooltip}
        .alt=${alt}
        .status=${status as Status}
        @click=${onClick}
      ></dy-avatar>
    `;
  };

  render = () => {
    if (!this.data) return html``;
    const rest = this.data.slice(this.#max);
    return html`
      ${this.data.slice(0, this.#max).map((avatar) => this.#renderAvatar(avatar))}
      ${rest.length
        ? html`
            <dy-avatar exportparts=${DuoyunAvatarElement.avatar} class="item" .tooltip=${rest.map((e) => e.alt).join()}>
              +${rest.length}
            </dy-avatar>
          `
        : ''}
    `;
  };
}
