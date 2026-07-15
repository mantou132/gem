import { adoptedStyle, customElement, property } from '@mantou/gem/lib/decorators';
import type { TemplateResult } from '@mantou/gem/lib/element';
import { css, html } from '@mantou/gem/lib/element';
import { styled } from '@mantou/gem/lib/utils';
import type { PersistentState } from 'tap-ui/elements/list';
import { TapListElement } from 'tap-ui/elements/list';

import { theme } from '../lib/theme';
import type { Status } from './status-light';

import './avatar';
import './divider';

export type { PersistentState };

export type Item = {
  title: string | TemplateResult;
  description?: string | TemplateResult;
  avatar?: string | TemplateResult;
  status?: Status;
};

const itemStyle = css({
  // 避免该样式干扰用户样式
  item: styled`
    display: flex;
    align-items: center;
    gap: 1em;
    font-size: 0.875em;
    padding: 0.5em;
    & .avatar {
      display: flex;
    }
    & .content {
      display: flex;
      flex-direction: column;
      gap: 0.2em;
      min-width: 0;
    }
    & .title,
    & .description {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    & .title {
      font-weight: 500;
    }
    & .description {
      color: ${theme.describeColor};
    }
  `,
});

@customElement('dy-list')
@adoptedStyle(itemStyle)
export class DuoyunListElement extends TapListElement {
  @property renderItem = (item: any) => {
    if (!item || typeof item !== 'object') return html`${item}`;
    const { title, avatar, description, status } = item as Item;
    return html`
      <div class=${itemStyle.item}>
        <div v-if=${!!avatar} class="avatar">
          ${
            typeof avatar === 'string'
              ? html`<dy-avatar src=${avatar} alt="Avatar" .status=${status as Status}></dy-avatar>`
              : avatar
          }
        </div>
        <div class="content">
          <div class="title">${title}</div>
          <div class="description">${description}</div>
        </div>
      </div>
      <dy-divider></dy-divider>
    `;
  };
}
