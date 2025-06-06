// https://spectrum.adobe.com/page/tree-view/
import type { Emitter } from '@mantou/gem/lib/decorators';
import {
  adoptedStyle,
  aria,
  boolattribute,
  customElement,
  effect,
  emitter,
  memo,
  numattribute,
  part,
  property,
  shadow,
  state,
  willMount,
} from '@mantou/gem/lib/decorators';
import type { TemplateResult } from '@mantou/gem/lib/element';
import { createState, css, GemElement, html } from '@mantou/gem/lib/element';
import { styleMap } from '@mantou/gem/lib/utils';

import { commonHandle } from '../lib/hotkeys';
import { icons } from '../lib/icons';
import { focusStyle } from '../lib/styles';
import { getSemanticColor, theme } from '../lib/theme';
import { getCascaderBubbleWeakMap } from '../lib/utils';

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

const itemStyle = css`
  :scope:where(:not([hidden])) {
    display: flex;
    align-items: center;
    gap: 0.3em;
    cursor: pointer;
    line-height: 2;
    user-select: none;
  }
  :scope:where(:hover, :state(active)) {
    background-color: ${theme.lightBackgroundColor};
  }
  :scope[highlight] {
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
`;

@customElement('dy-tree-item')
@adoptedStyle(itemStyle)
@aria({ focusable: true, role: 'treeitem' })
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
      <dy-use v-if=${!!icon} class="icon" .element=${icon}></dy-use>
      <div v-if=${!!context} class="context">${context}</div>
      <span class="label">${label}</span>
      <div v-if=${!tags && this.hastags} class="tags children"></div>
      <div v-if=${!!tags} class="tags">${tags?.join(', ')}</div>
    `;
  };
}

const style = css`
  :host(:where(:not([hidden]))) {
    display: block;
    font-size: 0.875em;
  }
`;

export type MouseEventDetail = { value: any; item: TreeItem; originEvent: MouseEvent };

@customElement('dy-tree')
@adoptedStyle(style)
@adoptedStyle(focusStyle)
@shadow({ delegatesFocus: true })
@aria({ role: 'tree' })
export class DuoyunTreeElement extends GemElement {
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

  #state = createState({
    expandItem: new Set(),
  });

  // auto expand to highlights
  @willMount()
  #auooExpand = () => this.expandToItems(this.highlights || []);

  #highlights: Set<any>;

  @memo((i) => [i.highlights])
  #setHighlights = () => (this.#highlights = new Set(this.highlights));

  // folder
  #tagsMap: WeakMap<TreeItem, string[]>;
  #statusMap: WeakMap<TreeItem, Status>;

  @memo((i) => [i.#items])
  #setMap = () => {
    this.#tagsMap = getCascaderBubbleWeakMap(this.#items, 'children', (e) => e.tags);
    this.#statusMap = getCascaderBubbleWeakMap(
      this.#items,
      'children',
      (e) => e.status,
      (a, b) => (statusRank[a] > statusRank[b] ? a : b),
    );
  };

  #onClick = (originEvent: MouseEvent, item: TreeItem) => {
    const value = getItemValue(item);
    this.itemclick({ value, item, originEvent });
    if (item.children || item.childrenPlaceholder) {
      const { expandItem } = this.#state;
      if (expandItem.has(value)) {
        expandItem.delete(value);
        this.collapse(item);
      } else {
        expandItem.add(value);
        this.expand(item);
      }
      this.#state({});
    }
  };

  #getItemColor = (item: TreeItem) => {
    const status = item.status || this.#statusMap.get(item);
    return (status && getSemanticColor(status)) || theme.textColor;
  };

  #renderItem = (item: TreeItem, level: number): TemplateResult => {
    const value = getItemValue(item);
    const expanded = this.#state.expandItem.has(value);
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
      ${
        !expanded
          ? ''
          : !item.children
            ? item.childrenPlaceholder
            : item.children.map((e) => this.#renderItem(e, level + 1))
      }
    `;
  };

  @effect((i) => [i.#items])
  #effect = () => {
    if (!this.#items) return;
    const getExpandableValues = (list: TreeItem[]): any[] =>
      list.map((e) => (e.children ? [getItemValue(e), ...getExpandableValues(e.children)] : []));
    const newValue = new Set(getExpandableValues(this.#items).flat(Infinity));
    this.#state.expandItem.forEach((e) => {
      if (!newValue.has(e)) {
        this.#state.expandItem.delete(e);
        this.#state({});
      }
    });
  };

  render = () => {
    return html`${this.#items?.map((item) => this.#renderItem(item, 0))}`;
  };

  isExpand(value: any) {
    return this.#state.expandItem.has(value);
  }

  expandToItems(values: any[]) {
    const set = new Set(values);
    getCascaderBubbleWeakMap(
      this.#items,
      'children',
      (item) => set.has(getItemValue(item)),
      (a, b) => a || b,
      (item, v) => !set.has(getItemValue(item)) && v && this.#state.expandItem.add(getItemValue(item)),
    );
    this.update();
  }

  collapseItems(values: any[]) {
    values.forEach((value) => {
      this.#state.expandItem.delete(value);
    });
    this.update();
  }

  iterateCollapseItem(value: any) {
    let start = false;
    const temp = this.#items ? [...this.#items] : [];
    while (temp.length) {
      const item = temp.pop()!;
      const v = getItemValue(item);
      if (v === value) {
        temp.length = 0;
        start = true;
      }
      if (start) this.#state.expandItem.delete(v);
      if (item.children) temp.push(...item.children);
    }
    this.update();
  }
}
