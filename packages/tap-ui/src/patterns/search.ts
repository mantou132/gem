import type { Emitter } from '@mantou/gem/lib/decorators';
import {
  adoptedStyle,
  attribute,
  boolattribute,
  connectStore,
  customElement,
  emitter,
  light,
  property,
  template,
} from '@mantou/gem/lib/decorators';
import { createState, css, GemElement, html } from '@mantou/gem/lib/element';

import type { CellItem } from '../elements/cell';
import { locale } from '../lib/locale';
import { theme } from '../lib/theme';
import type { PickerItem } from './picker';

import '../elements/cell';
import '../elements/empty';
import '../elements/navbar';
import '../elements/page';
import '../elements/searchbar';
import '../elements/tag';

export type SearchItem = Omit<PickerItem, 'keywords'>;

const style = css({
  $: `
    display: block;
    flex-grow: 1;
    contain: layout;
  `,
  historyHeader: `
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75em 1em 0.5em;
    font-size: 0.8125em;
    color: ${theme.describeColor};
  `,
  clear: `
    padding: 0;
    border: none;
    background: transparent;
    color: ${theme.primaryColor};
    font: inherit;
    cursor: pointer;
  `,
  history: `
    display: flex;
    flex-wrap: wrap;
    gap: 0.5em;
    padding-inline: 1em;
  `,
  icon: `
    margin-inline-end: 0.5em;
  `,
  empty: `
    display: flex;
    padding-block: 3em;
  `,
});

/**
 * 搜索页，空查询时显示搜索历史，有查询时显示结果
 *
 * 输入时发出 `search`，结果由调用方异步获取后设置 `items`；选择后只发出 `change`
 */
@customElement('tap-pat-search')
@adoptedStyle(style)
@connectStore(locale)
// 条目可传入模板，需要能被调用方样式化
@light({ penetrable: true })
export class TapPatSearchElement extends GemElement {
  @attribute heading: string;
  @attribute placeholder: string;
  /**Show the back button of the navbar, pops the closest stack */
  @boolattribute back: boolean;
  /**Show the loading progress while fetching `items` */
  @boolattribute loading: boolean;

  /**Results of the current query */
  @property items?: SearchItem[];
  /**Recent queries, shown when the query is empty */
  @property history?: string[];

  /**Query changed, fetch the results */
  @emitter search: Emitter<string>;
  /**Enter pressed or a recent query tapped, e.g. save it to the history */
  @emitter submit: Emitter<string>;
  @emitter change: Emitter<string>;
  @emitter clearhistory: Emitter<null>;

  #state = createState({ query: '' });

  #setQuery = (query: string) => {
    this.#state({ query });
    this.search(query);
  };

  #onChange = (evt: CustomEvent<string>) => {
    // `<tap-searchbar>` 的 `change` 会冒泡，避免和自身的 `change` 混淆
    evt.stopPropagation();
    this.#setQuery(evt.detail);
  };

  #onSubmit = (evt: CustomEvent<string>) => {
    evt.stopPropagation();
    if (evt.detail.trim()) this.submit(evt.detail);
  };

  #onSelectHistory = (query: string) => {
    this.#setQuery(query);
    this.submit(query);
  };

  #toCell = (item: SearchItem): CellItem => {
    const value = item.value ?? item.label;
    return {
      label: item.icon ? html`<span class=${style.icon}>${item.icon}</span>${item.label}` : item.label,
      description: item.description,
      action: !!item.action,
      onClick: () => this.change(value),
    };
  };

  #renderHistory = () => {
    if (!this.history?.length) return '';
    return html`
      <div class=${style.historyHeader}>
        <span>${locale.recentSearches}</span>
        <button class=${style.clear} type="button" @click=${() => this.clearhistory(null)}>${locale.clear}</button>
      </div>
      <div class=${style.history}>
        ${this.history.map((query) => html`<tap-tag @click=${() => this.#onSelectHistory(query)}>${query}</tap-tag>`)}
      </div>
    `;
  };

  #renderResult = () => {
    const items = this.items || [];
    if (items.length) return html`<tap-cell-group .items=${items.map(this.#toCell)}></tap-cell-group>`;
    if (this.loading) return '';
    return html`<tap-empty class=${style.empty} text=${locale.noData}></tap-empty>`;
  };

  @template()
  #content = () => {
    const { query } = this.#state;
    return html`
      <tap-page ?loading=${this.loading}>
        <tap-navbar
          v-if=${!!this.heading || this.back}
          slot="header"
          title=${this.heading}
          ?back=${this.back}
          default-back
        ></tap-navbar>
        <tap-searchbar
          placeholder=${this.placeholder}
          value=${query}
          autofocus
          @change=${this.#onChange}
          @submit=${this.#onSubmit}
        ></tap-searchbar>
        ${query ? this.#renderResult() : this.#renderHistory()}
      </tap-page>
    `;
  };
}
