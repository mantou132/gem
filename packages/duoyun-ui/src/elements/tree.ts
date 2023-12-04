// https://spectrum.adobe.com/page/tree-view/
import {
  adoptedStyle,
  customElement,
  emitter,
  Emitter,
  property,
  boolattribute,
  part,
} from '@mantou/gem/lib/decorators';
import { GemElement, html, TemplateResult } from '@mantou/gem/lib/element';
import { createCSSSheet, css, styleMap } from '@mantou/gem/lib/utils';

import { icons } from '../lib/icons';
import { commonHandle } from '../lib/hotkeys';
import { theme, getSemanticColor } from '../lib/theme';
import { getCascaderBubbleWeakMap } from '../lib/utils';
import { focusStyle } from '../lib/styles';

import './use';

type Status = 'positive' | 'notice' | 'negative';

const statusRank: Record<Status, number> = {
  negative: 3,
  notice: 2,
  positive: 1,
};

export type TreeItem = {
  label: string;
  // fallback label
  value?: any;
  icon?: string | Element | DocumentFragment;
  context?: TemplateResult;
  children?: TreeItem[];

  // infect parent
  status?: Status;
  tags?: string[];
};

const itemStyle = createCSSSheet(css`
  :host(:where(:not([hidden]))) {
    display: flex;
    align-items: center;
    gap: 0.3em;
    cursor: pointer;
    line-height: 2;
    user-select: none;
  }
  :host(:hover) {
    background-color: ${theme.lightBackgroundColor};
  }
  :host([highlight]) {
    background-color: ${theme.hoverBackgroundColor};
  }
  .icon {
    width: 1.3em;
    flex-shrink: 0;
  }
  .expandable {
    margin-inline-start: 0.3em;
  }
  .label {
    flex-grow: 1;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .tags {
    flex-shrink: 1;
    white-space: nowrap;
    margin-inline: 1em;
  }
  .children {
    width: 0.5em;
    aspect-ratio: 1;
    background: currentColor;
    border-radius: 10em;
  }
`);

/**
 * @customElement dy-tree-item
 */
@customElement('dy-tree-item')
@adoptedStyle(itemStyle)
class _DuoyunTreeItemElement extends GemElement {
  @boolattribute expanded: boolean;
  @boolattribute highlight: boolean;
  @boolattribute hastags: boolean;

  @property item?: TreeItem;

  constructor() {
    super({ delegatesFocus: true });
    this.internals.role = 'treeitem';
  }

  render = () => {
    if (!this.item) return html``;
    const { label, children, icon, context, tags } = this.item;
    return html`
      <dy-use
        class="icon expandable"
        .element=${!children ? undefined : this.expanded ? icons.expand : icons.right}
      ></dy-use>
      ${icon ? html`<dy-use class="icon" .element=${icon}></dy-use>` : ''}
      ${context ? html`<div class="context">${context}</div>` : ''}
      <span class="label">${label}</span>
      ${this.hastags ? html`<div class="tags children"></div>` : ''}
      ${tags ? html`<div class="tags">${tags.join(', ')}</div>` : ''}
    `;
  };
}

type State = {
  expandItem: Set<any>;
};

const style = createCSSSheet(css`
  :host(:where(:not([hidden]))) {
    display: block;
    font-size: 0.875em;
  }
`);

/**
 * @customElement dy-tree
 * @fires itemclick
 */
@customElement('dy-tree')
@adoptedStyle(style)
@adoptedStyle(focusStyle)
export class DuoyunTreeElement extends GemElement<State> {
  @part static item: string;

  @property data?: TreeItem[];
  /**value array */
  @property highlights?: any[];

  @emitter itemclick: Emitter;

  state: State = {
    expandItem: new Set(),
  };

  constructor() {
    super({ delegatesFocus: true });
    this.internals.role = 'tree';
  }

  #highlights: Set<any>;
  // folder
  #tagsMap: WeakMap<TreeItem, string[]>;
  #statusMap: WeakMap<TreeItem, Status>;

  #onClick = (item: TreeItem) => {
    const value = item.value ?? item.label;
    this.itemclick(value);
    if (item.children) {
      const { expandItem } = this.state;
      if (expandItem.has(value)) {
        expandItem.delete(value);
      } else {
        expandItem.add(value);
      }
      this.setState({});
    }
  };

  #getItemColor = (item: TreeItem) => {
    const status = item.status || this.#statusMap.get(item);
    return (status && getSemanticColor(status)) || theme.textColor;
  };

  #renderItem = (item: TreeItem, level: number): TemplateResult => {
    const value = item.value ?? item.label;
    const expanded = this.state.expandItem.has(item.value ?? item.label);
    return html`
      <dy-tree-item
        tabindex="0"
        @keydown=${commonHandle}
        @click=${() => this.#onClick(item)}
        part=${DuoyunTreeElement.item}
        style=${styleMap({ paddingLeft: `${level}em`, color: this.#getItemColor(item) })}
        .hastags=${this.#tagsMap.has(item)}
        .item=${item}
        .expanded=${expanded}
        .highlight=${this.#highlights.has(value)}
      ></dy-tree-item>
      ${expanded ? item.children?.map((item) => this.#renderItem(item, level + 1)) : ''}
    `;
  };

  willMount = () => {
    this.memo(
      () => {
        this.#highlights = new Set(this.highlights);
      },
      () => [this.highlights],
    );
    this.memo(
      () => {
        this.#tagsMap = getCascaderBubbleWeakMap(this.data, 'children', (e) => e.tags);
        this.#statusMap = getCascaderBubbleWeakMap(
          this.data,
          'children',
          (e) => e.status,
          (a, b) => (statusRank[a] > statusRank[b] ? a : b),
        );
      },
      () => [this.data],
    );
  };

  mounted = () => {
    this.effect(
      () => {
        if (!this.data) return;
        const getExpandableValues = (list: TreeItem[]): any[] =>
          list.map((e) => (e.children ? [e.label ?? e.value, ...getExpandableValues(e.children)] : undefined));
        const newValue = new Set(getExpandableValues(this.data).flat());
        this.state.expandItem.forEach((e) => {
          if (!newValue.has(e)) {
            this.state.expandItem.delete(e);
            this.setState({});
          }
        });
      },
      () => [this.data],
    );
  };

  render = () => {
    return html`${this.data?.map((item) => this.#renderItem(item, 0))}`;
  };
}
