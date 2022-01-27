// TODO: implement infinite scroll
import { adoptedStyle, customElement, property } from '@mantou/gem/lib/decorators';
import { GemElement, html, TemplateResult } from '@mantou/gem/lib/element';
import { createCSSSheet, css } from '@mantou/gem/lib/utils';

import { theme } from '../lib/theme';

import type { Status } from './status-light';

import './avatar';
import './divider';

type Item = {
  title: string | TemplateResult;
  description?: string | TemplateResult;
  avatar?: string | TemplateResult;
  status?: Status;
};

const style = createCSSSheet(css`
  :host {
    display: flex;
    flex-direction: column;
    gap: 0.5em;
    font-size: 0.875em;
  }
`);

/**
 * @customElement dy-list
 */
@customElement('dy-list')
@adoptedStyle(style)
export class DuoyunListElement extends GemElement {
  @property data?: Item[];
  @property renderItem?: (item: Item) => TemplateResult;

  constructor() {
    super();
    this.internals.role = 'list';
  }

  render = () => {
    return html`${this.data?.map(
      (item) =>
        html`
          <dy-list-item .data=${item} .renderItem=${this.renderItem}></dy-list-item>
          <dy-divider></dy-divider>
        `,
    )}`;
  };
}

const itemStyle = createCSSSheet(css`
  :host {
    display: flex;
    align-items: center;
    gap: 1em;
  }
  .content {
    display: flex;
    flex-direction: column;
    gap: 0.2em;
    min-width: 0;
  }
  .title,
  .description {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .title {
    font-weight: 500;
  }
  .description {
    color: ${theme.describeColor};
  }
`);

/**
 * @customElement dy-list-item
 */
@customElement('dy-list-item')
@adoptedStyle(itemStyle)
export class DuoyunListItemElement extends GemElement {
  @property data?: Item;
  @property renderItem?: (item: Item) => TemplateResult;

  constructor() {
    super({ isAsync: true });
    this.internals.role = 'listitem';
  }

  render = () => {
    if (!this.data) return html``;
    const { title, avatar, description, status } = this.data;
    return this.renderItem
      ? this.renderItem(this.data)
      : html`
          ${!avatar
            ? ''
            : html`
                <div class="avatar">
                  ${typeof avatar === 'string'
                    ? html`<dy-avatar src=${avatar} alt="Avatar" .status=${status as Status}></dy-avatar>`
                    : avatar}
                </div>
              `}
          <div class="content">
            <div class="title">${title}</div>
            <div class="description">${description}</div>
          </div>
        `;
  };
}
