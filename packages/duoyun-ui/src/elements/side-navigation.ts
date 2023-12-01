import { connectStore, adoptedStyle, customElement, property } from '@mantou/gem/lib/decorators';
import { html, TemplateResult } from '@mantou/gem/lib/element';
import { history } from '@mantou/gem/lib/history';
import { createCSSSheet, css, QueryString } from '@mantou/gem/lib/utils';

import { theme } from '../lib/theme';
import { commonHandle } from '../lib/hotkeys';
import { focusStyle } from '../lib/styles';

import { createPath, matchPath } from './route';
import { DuoyunScrollBaseElement } from './base/scroll';

import './link';

interface Item {
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

const style = createCSSSheet(css`
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
    justify-content: space-between;
    position: relative;
    padding: 0.5em 0.75em;
    font-size: 0.875em;
    border-radius: ${theme.normalRound};
    color: unset;
    text-decoration: none;
    line-height: 1.2;
  }
  .children .item {
    padding-inline-start: calc(0.75em + 1em);
  }
  .item:where(:hover, :--active, :state(active)) {
    background-color: ${theme.hoverBackgroundColor};
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
`);

type State = Record<string, boolean>;

/**
 * @customElement dy-side-navigation
 */
@customElement('dy-side-navigation')
@adoptedStyle(style)
@adoptedStyle(focusStyle)
@connectStore(history.store)
export class DuoyunSideNavigationElement extends DuoyunScrollBaseElement<State> {
  @property items: NavItems = [];

  // children open state
  state: State = {};

  constructor() {
    super();
    this.internals.role = 'navigation';
    this.internals.ariaLabel = 'Side Navigation';
  }

  #onClickChildren = (title: string) => {
    this.setState({ [title]: !this.state[title] });
  };

  #checkGroupStatus = () => {
    const { path } = history.getParams();
    const matchChildren = (e: Item | NavItemGroup) => {
      if ('group' in e) {
        e.group.forEach(matchChildren);
        return;
      }
      const has = e.children?.some((e) =>
        e.pattern ? matchPath(e.pattern, path) : e.children ? e.children.some(matchChildren) : false,
      );
      if (has && e.title) {
        this.setState({ [e.title]: true });
        return true;
      }
    };
    this.items.forEach(matchChildren);
  };

  #renderItem = ({ pattern, title = '<No Title>', slot, params, query, hash, children }: Item): TemplateResult => {
    return html`
      <dy-active-link
        class="item"
        tabindex="0"
        @keydown=${commonHandle}
        @click=${children && (() => this.#onClickChildren(title))}
        doc-title=${title}
        path=${pattern ? createPath({ pattern }, { params }) : ''}
        query=${query ? query.toString() : ''}
        hash=${hash || ''}
        pattern=${!pattern ? '' : pattern.endsWith('*') ? pattern : `${pattern}/*`}
      >
        <span>${title}</span>${slot}
      </dy-active-link>
      ${children && this.state[title] ? html`<div class="children">${children.map(this.#renderItem)}</div>` : ''}
    `;
  };

  willMount = () => {
    this.memo(
      () => this.#checkGroupStatus(),
      () => [history.getParams().path],
    );
  };

  render = () => {
    if (!this.items.length) return html``;
    return html`${this.items.map((item) =>
      'group' in item
        ? html`
            <div class="group" role="group">
              <div class="group-title">${item.title}${item.slot}</div>
              <div class="group-body">${item.group.map((e) => this.#renderItem(e))}</div>
            </div>
          `
        : this.#renderItem(item),
    )}`;
  };
}
