import type { Emitter } from '@mantou/gem/lib/decorators';
import {
  adoptedStyle,
  attribute,
  boolattribute,
  connectStore,
  customElement,
  emitter,
  light,
  memo,
  property,
  template,
} from '@mantou/gem/lib/decorators';
import type { TemplateResult } from '@mantou/gem/lib/element';
import { createState, css, GemElement, html } from '@mantou/gem/lib/element';

import type { CellItem } from '../elements/cell';
import { icons } from '../lib/icons';
import { locale } from '../lib/locale';
import { theme } from '../lib/theme';

import '../elements/cell';
import '../elements/empty';
import '../elements/list-index';
import '../elements/navbar';
import '../elements/page';
import '../elements/searchbar';
import '../elements/use';

export type PickerItem = {
  label: string;
  /**Defaults to `label` */
  value?: string;
  /**Shown before the label, e.g. a flag emoji */
  icon?: string | TemplateResult;
  description?: string;
  /**Extra search terms besides the label and value */
  keywords?: string[];
  /**Has a next level, shows a trailing chevron instead of the checkmark */
  action?: boolean;
};

type PickerGroup = {
  initial: string;
  items: PickerItem[];
};

const OTHER_INITIAL = '#';

// 每个字母对应的拼音排序最靠前的汉字，`Intl` 无法直接取得拼音首字母
const hanAnchors = [...'吖八嚓咑妸发旮哈丌咔垃妈拿喔妑七呥仨他挖夕丫帀'];
const hanLetters = 'ABCDEFGHJKLMNOPQRSTWXYZ';
const hanCollator = new Intl.Collator('zh');

function getInitial(label: string) {
  const char = label.normalize('NFD').charAt(0);
  if (/\p{Script=Han}/u.test(char)) {
    const index = hanAnchors.findLastIndex((anchor) => hanCollator.compare(anchor, char) <= 0);
    return hanLetters[index] || OTHER_INITIAL;
  }
  return /\p{L}/u.test(char) ? char.toLocaleUpperCase() : OTHER_INITIAL;
}

const style = css({
  // 让 `<tap-page>` 和 `<tap-list-index>` 定位在自身范围内
  $: `
    display: block;
    flex-grow: 1;
    contain: layout;
  `,
  icon: `
    margin-inline-end: 0.5em;
  `,
  check: `
    display: block;
    width: 1.25em;
    color: ${theme.primaryColor};
  `,
  empty: `
    padding-block: 3em;
  `,
});

/**
 * 可搜索、带字母索引的单选列表页，例如国家/地区、城市、语言
 *
 * 选择后只发出 `change`，进入下一级或关闭由调用方处理
 */
@customElement('tap-pat-picker')
@adoptedStyle(style)
@connectStore(locale)
// 条目可传入模板，需要能被调用方样式化
@light({ penetrable: true })
export class TapPatPickerElement extends GemElement {
  @attribute heading: string;
  @attribute value: string;
  @attribute pinnedHeading: string;
  /**Show the back button of the navbar, pops the closest stack */
  @boolattribute back: boolean;
  @boolattribute searchable: boolean;
  /**Sort items and group them by initial, with a side index */
  @boolattribute indexed: boolean;

  @property items?: PickerItem[];
  /**Shown above all items, e.g. the current region */
  @property pinned?: PickerItem[];

  @emitter change: Emitter<string>;

  #state = createState({ query: '' });

  #groups: PickerGroup[] = [];

  @memo((i) => [i.items, i.indexed, locale.localeCode])
  #updateGroups = () => {
    const items = this.items || [];
    if (!this.indexed) {
      this.#groups = [{ initial: '', items }];
      return;
    }
    const collator = new Intl.Collator(locale.localeCode);
    const groups = new Map<string, PickerItem[]>();
    [...items]
      .sort((a, b) => collator.compare(a.label, b.label))
      .forEach((item) => {
        const initial = getInitial(item.label);
        groups.set(initial, [...(groups.get(initial) || []), item]);
      });
    this.#groups = [...groups]
      .map(([initial, items]) => ({ initial, items }))
      .sort((a, b) => Number(a.initial === OTHER_INITIAL) - Number(b.initial === OTHER_INITIAL));
  };

  get #matched() {
    const query = this.#state.query.trim().toLocaleLowerCase();
    return (this.items || []).filter((item) =>
      [item.label, item.value, ...(item.keywords || [])].some((text) => text?.toLocaleLowerCase().includes(query)),
    );
  }

  #toCell = (item: PickerItem): CellItem => {
    const value = item.value ?? item.label;
    const selected = !item.action && value === this.value;
    return {
      label: item.icon ? html`<span class=${style.icon}>${item.icon}</span>${item.label}` : item.label,
      description: item.description,
      action: !!item.action,
      extra: selected ? html`<tap-use class=${style.check} .element=${icons.check}></tap-use>` : undefined,
      onClick: () => this.change(value),
    };
  };

  #onSearch = (evt: CustomEvent<string>) => {
    evt.stopPropagation();
    this.#state({ query: evt.detail });
  };

  #renderList = () => {
    if (this.#state.query) {
      const matched = this.#matched;
      return matched.length
        ? html`<tap-cell-group .items=${matched.map(this.#toCell)}></tap-cell-group>`
        : html`<tap-empty class=${style.empty} text=${locale.noData}></tap-empty>`;
    }
    const groups = this.#groups;
    return html`
      <tap-cell-group
        v-if=${!!this.pinned?.length}
        heading=${this.pinnedHeading}
        .items=${this.pinned?.map(this.#toCell)}
      ></tap-cell-group>
      ${groups.map(
        ({ initial, items }) => html`
          <tap-cell-group data-list-index=${initial} heading=${initial} .items=${items.map(this.#toCell)}></tap-cell-group>
        `,
      )}
      <tap-list-index v-if=${this.indexed} .items=${groups.map(({ initial }) => initial)}></tap-list-index>
    `;
  };

  @template()
  #content = () => {
    return html`
      <tap-page>
        <tap-navbar
          v-if=${!!this.heading || this.back}
          slot="header"
          title=${this.heading}
          ?back=${this.back}
          default-back
        ></tap-navbar>
        <tap-searchbar
          v-if=${this.searchable}
          placeholder=${locale.search}
          value=${this.#state.query}
          @change=${this.#onSearch}
        ></tap-searchbar>
        ${this.#renderList()}
      </tap-page>
    `;
  };
}
