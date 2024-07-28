// https://spectrum.adobe.com/page/tree-view/
import {
  adoptedStyle,
  customElement,
  emitter,
  Emitter,
  property,
  boolattribute,
  part,
  state,
  numattribute,
  shadow,
  aria,
  focusable,
} from '@mantou/gem/lib/decorators';
import { createCSSSheet, GemElement, html, TemplateResult } from '@mantou/gem/lib/element';
import { css, styleMap } from '@mantou/gem/lib/utils';

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
  childrenPlaceholder?: TemplateResult;

  // infect parent, color
  status?: Status;
  // infect parent, show dot
  tags?: string[];
};

function getItemValue(item: TreeItem) {
  return item.value ?? item.label;
}

const itemStyle = createCSSSheet(css`
  :host(:where(:not([hidden]))) {
    display: flex;
    align-items: center;
    gap: 0.3em;
    cursor: pointer;
    line-height: 2;
    user-select: none;
  }
  :host(:where(:hover, :state(active))) {
    background-color: ${theme.lightBackgroundColor};
  }
  :host([highlight]) {
    background-color: ${theme.hoverBackgroundColor};
  }
  .padding {
    margin-inline-start: 0.3em;
    width: calc(0.65em - 1px);
    border-right: 1px solid ${theme.borderColor};
    align-self: stretch;
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
@focusable()
@aria({ role: 'treeitem' })
@shadow()
class _DuoyunTreeItemElement extends GemElement {
  @boolattribute expanded: boolean;
  @boolattribute highlight: boolean;
  @boolattribute hastags: boolean;
  @numattribute level: number;

  @property item?: TreeItem;

  @state active: boolean;

  render = () => {
    if (!this.item) return html``;
    const { label, children, childrenPlaceholder, icon, context, tags } = this.item;
    return html`
      ${Array.from({ length: this.level }, () => html`<span class="padding"></span>`)}
      <dy-use
        class="icon expandable"
        .element=${!children && !childrenPlaceholder ? undefined : this.expanded ? icons.expand : icons.right}
      ></dy-use>
      ${icon ? html`<dy-use class="icon" .element=${icon}></dy-use>` : ''}
      ${context ? html`<div class="context">${context}</div>` : ''}
      <span class="label">${label}</span>
      ${!tags && this.hastags ? html`<div class="tags children"></div>` : ''}
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

export type MouseEventDetail = { value: any; item: TreeItem; originEvent: MouseEvent };

/**
 * @customElement dy-tree
 * @fires itemclick
 * @fires itemcontextmenu
 * @fires expand
 * @fires collapse
 */
@customElement('dy-tree')
@adoptedStyle(style)
@adoptedStyle(focusStyle)
@shadow({ delegatesFocus: true })
@aria({ role: 'tree' })
export class DuoyunTreeElement extends GemElement<State> {
  @part static item: string;

  /**@deprecated */
  @property data?: TreeItem[];
  @property items?: TreeItem[];
  /**value array */
  @property highlights?: any[];

  @emitter itemclick: Emitter<MouseEventDetail>;
  @emitter itemcontextmenu: Emitter<MouseEventDetail>;
  @emitter expand: Emitter<TreeItem>;
  @emitter collapse: Emitter<TreeItem>;

  get #items() {
    return this.items || this.data;
  }

  state: State = {
    expandItem: new Set(),
  };

  #highlights: Set<any>;
  // folder
  #tagsMap: WeakMap<TreeItem, string[]>;
  #statusMap: WeakMap<TreeItem, Status>;

  #onClick = (originEvent: MouseEvent, item: TreeItem) => {
    const value = getItemValue(item);
    this.itemclick({ value, item, originEvent });
    if (item.children || item.childrenPlaceholder) {
      const { expandItem } = this.state;
      if (expandItem.has(value)) {
        expandItem.delete(value);
        this.collapse(item);
      } else {
        expandItem.add(value);
        this.expand(item);
      }
      this.setState({});
    }
  };

  #getItemColor = (item: TreeItem) => {
    const status = item.status || this.#statusMap.get(item);
    return (status && getSemanticColor(status)) || theme.textColor;
  };

  #renderItem = (item: TreeItem, level: number): TemplateResult => {
    const value = getItemValue(item);
    const expanded = this.state.expandItem.has(value);
    return html`
      <dy-tree-item
        @keydown=${commonHandle}
        @click=${(evt: MouseEvent) => this.#onClick(evt, item)}
        @contextmenu=${(originEvent: MouseEvent) => this.itemcontextmenu({ originEvent, item, value })}
        part=${DuoyunTreeElement.item}
        style=${styleMap({ color: this.#getItemColor(item) })}
        .level=${level}
        .hastags=${this.#tagsMap.has(item)}
        .item=${item}
        .expanded=${expanded}
        .highlight=${this.#highlights.has(value)}
      ></dy-tree-item>
      ${!expanded
        ? ''
        : !item.children
          ? item.childrenPlaceholder
          : item.children.map((e) => this.#renderItem(e, level + 1))}
    `;
  };

  willMount = () => {
    // auto expand to highlights
    this.expandToItems(this.highlights || []);
    this.memo(
      () => (this.#highlights = new Set(this.highlights)),
      () => [this.highlights],
    );
    this.memo(
      () => {
        this.#tagsMap = getCascaderBubbleWeakMap(this.#items, 'children', (e) => e.tags);
        this.#statusMap = getCascaderBubbleWeakMap(
          this.#items,
          'children',
          (e) => e.status,
          (a, b) => (statusRank[a] > statusRank[b] ? a : b),
        );
      },
      () => [this.#items],
    );
  };

  mounted = () => {
    this.effect(
      () => {
        if (!this.#items) return;
        const getExpandableValues = (list: TreeItem[]): any[] =>
          list.map((e) => (e.children ? [getItemValue(e), ...getExpandableValues(e.children)] : []));
        const newValue = new Set(getExpandableValues(this.#items).flat(Infinity));
        this.state.expandItem.forEach((e) => {
          if (!newValue.has(e)) {
            this.state.expandItem.delete(e);
            this.setState({});
          }
        });
      },
      () => [this.#items],
    );
  };

  render = () => {
    return html`${this.#items?.map((item) => this.#renderItem(item, 0))}`;
  };

  isExpand(value: any) {
    return this.state.expandItem.has(value);
  }

  expandToItems(values: any[]) {
    const set = new Set(values);
    getCascaderBubbleWeakMap(
      this.#items,
      'children',
      (item) => set.has(getItemValue(item)),
      (a, b) => a || b,
      (item, v) => !set.has(getItemValue(item)) && v && this.state.expandItem.add(getItemValue(item)),
    );
    this.update();
  }

  collapseItems(values: any[]) {
    values.forEach((value) => {
      this.state.expandItem.delete(value);
    });
    this.update();
  }

  iterateCollapseItem(value: any) {
    let start = false;
    const temp = this.#items ? [...this.#items] : [];
    while (!!temp.length) {
      const item = temp.pop()!;
      const v = getItemValue(item);
      if (v === value) {
        temp.length = 0;
        start = true;
      }
      if (start) this.state.expandItem.delete(v);
      if (item.children) temp.push(...item.children);
    }
    this.update();
  }
}
