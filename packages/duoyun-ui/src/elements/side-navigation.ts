import {
  adoptedStyle,
  aria,
  connectStore,
  customElement,
  memo,
  part,
  property,
  shadow,
  state,
} from '@mantou/gem/lib/decorators';
import type { TemplateResult } from '@mantou/gem/lib/element';
import { createState, css, html } from '@mantou/gem/lib/element';
import { history } from '@mantou/gem/lib/history';
import type { QueryString } from '@mantou/gem/lib/utils';

import { commonColors } from '../lib/color';
import { commonHandle } from '../lib/hotkeys';
import { createSVGFromText } from '../lib/image';
import { focusStyle } from '../lib/styles';
import { theme } from '../lib/theme';
import { DuoyunScrollBaseElement } from './base/scroll';
import { createPath, matchPath } from './route';

import './link';
import './use';

const cache = new Map<string, string>();
function getIcon(title: string) {
  const icon =
    cache.get(title) ||
    createSVGFromText(title.replaceAll(/[^\w]/g, ''), {
      translate: [0, 0],
      rotate: 0,
      colors: commonColors,
    });
  cache.set(title, icon);
  return icon;
}

interface Item {
  icon?: string | Element | DocumentFragment;
  title?: string;
  slot?: TemplateResult;
  pattern?: string;
  params?: Record<string, string>;
  query?: QueryString | string;
  hash?: string;
  children?: Item[];
}

interface NavItemGroup {
  title?: string;
  slot?: TemplateResult;
  group: Item[];
}

export type NavItems = (Item | NavItemGroup)[];

const style = css`
  :host(:where(:not([hidden]))) {
    user-select: none;
    display: flex;
  }
  :host,
  .group-body,
  .children {
    flex-direction: column;
    gap: 3px;
  }
  .group-body,
  .children {
    display: flex;
  }
  .item {
    display: flex;
    gap: 1em;
    justify-content: space-between;
    align-items: center;
    position: relative;
    padding: 0.5em 0.75em;
    font-size: 0.875em;
    border-radius: ${theme.normalRound};
    color: unset;
    text-decoration: none;
    line-height: 1.2;
  }
  .title-wrap {
    display: flex;
    align-items: center;
    gap: 1em;
    width: 0;
    flex-grow: 1;
  }
  .icon {
    flex-shrink: 0;
    width: 1.2em;
  }
  .title {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  :host(:not(:state(compact))) .children .item {
    padding-inline-start: calc(0.75em + 1em);
  }
  .item:where(:hover, :state(active)) {
    background-color: ${theme.hoverBackgroundColor};
    &:active {
      background: color-mix(in srgb, ${theme.hoverBackgroundColor}, currentColor 3%);
    }
  }
  .group {
    margin-block: 1.2em;
  }
  .group + .group {
    margin-top: 0;
  }
  .group-title {
    cursor: default;
    padding: 0.945em;
    text-transform: uppercase;
    font-size: 0.7em;
    color: ${theme.describeColor};
  }
  :host(:state(compact)) :where(.group-title, .title, .title-wrap + *) {
    display: none;
  }
  :host(:state(compact)) :where(.item, .title-wrap) {
    justify-content: center;
  }
`;

@customElement('dy-side-navigation')
@adoptedStyle(style)
@adoptedStyle(focusStyle)
@connectStore(history.store)
@shadow({ delegatesFocus: true })
@aria({ role: 'navigation', ariaLabel: 'Side Navigation' })
export class DuoyunSideNavigationElement extends DuoyunScrollBaseElement {
  @part static item: string;
  @part static group: string;
  @part static groupTitle: string;
  @part static groupBody: string;

  @property items?: NavItems = [];

  @state compact: boolean;

  // children open state
  #state = createState<Record<string, boolean>>({});

  @memo(() => [history.getParams().path])
  #checkGroupStatus = () => {
    const { path } = history.getParams();
    const matchChildren = (item: Item | NavItemGroup) => {
      if ('group' in item) {
        item.group.forEach(matchChildren);
        return;
      }
      const has = item.children?.some((e) =>
        e.pattern ? matchPath(e.pattern, path) : e.children ? e.children.some(matchChildren) : false,
      );
      if (has && item.title) {
        this.#state({ [item.title]: true });
        return true;
      }
    };
    this.items?.forEach(matchChildren);
  };

  #onClickChildren = (title: string) => {
    this.#state({ [title]: !this.#state[title] });
  };

  #renderItem = ({
    pattern,
    title = '<No Title>',
    slot,
    params,
    query,
    hash,
    children,
    icon,
  }: Item): TemplateResult => {
    const ico = icon || (this.compact && getIcon(title));
    return html`
      <dy-active-link
        class="item"
        tabindex="0"
        part=${DuoyunSideNavigationElement.item}
        @keydown=${commonHandle}
        @click=${children && (() => this.#onClickChildren(title))}
        path=${pattern ? createPath({ pattern }, { params }) : ''}
        query=${query ? query.toString() : ''}
        hash=${hash || ''}
        pattern=${!pattern ? '' : pattern.endsWith('*') ? pattern : `${pattern}/*`}
      >
        <div class="title-wrap">
          <dy-use v-if=${!!ico} class="icon" .element=${ico || ''}></dy-use>
          <span class="title">${title}</span>
        </div>
        ${slot}
      </dy-active-link>
      <div v-if=${!!children && this.#state[title]} class="children">${children?.map(this.#renderItem)}</div>
    `;
  };

  render = () => {
    if (!this.items?.length) return html``;
    this.compact = this.contentRect.width < 100;
    return html`${this.items.map((item) =>
      'group' in item
        ? html`
            <div class="group" role="group" part=${DuoyunSideNavigationElement.group}>
              <div class="group-title" part=${DuoyunSideNavigationElement.groupTitle}>${item.title}${item.slot}</div>
              <div class="group-body" part=${DuoyunSideNavigationElement.groupBody}>
                ${item.group.map((e) => this.#renderItem(e))}
              </div>
            </div>
          `
        : this.#renderItem(item),
    )}`;
  };
}
