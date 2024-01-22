import { GemElement, TemplateResult, html } from '@mantou/gem/lib/element';
import { QueryString, createCSSSheet, css } from '@mantou/gem/lib/utils';
import {
  Emitter,
  RefObject,
  adoptedStyle,
  boolattribute,
  connectStore,
  customElement,
  emitter,
  numattribute,
  property,
  refobject,
} from '@mantou/gem/lib/decorators';
import { history } from '@mantou/gem/lib/history';
import { Store, connect } from '@mantou/gem/lib/store';

import { ContextMenuItem, ContextMenu } from '../elements/contextmenu';
import { theme } from '../lib/theme';
import {
  comparer,
  readProp,
  isIncludesString,
  splitString,
  sleep,
  ComparerType,
  getStringFromTemplate,
  convertToMap,
  throttle,
} from '../lib/utils';
import type { Column, ItemContextMenuEventDetail, DuoyunTableElement } from '../elements/table';
import { blockContainer } from '../lib/styles';
import { findScrollContainer } from '../lib/element';
import { Time, formatDuration } from '../lib/time';
import type { DuoyunButtonElement } from '../elements/button';
import { locale } from '../lib/locale';
import { icons } from '../lib/icons';
import { isNotBoolean } from '../lib/types';
import { hotkeys } from '../lib/hotkeys';
import { PaginationStore } from '../helper/store';

import { locationStore } from './console';
import type { FilterableOptions, FilterableType } from './filter-form';

import '../elements/input';
import '../elements/button';
import '../elements/tag';
import '../elements/table';
import '../elements/pagination';
import '../elements/scroll-box';

import './filter-form';

export type FilterableColumn<T> = Column<T> & {
  data?: FilterableOptions & {
    field?: keyof T | string[];
    getSearchText?: (e: T) => string;
  };
};

export const queryKeys = {
  PAGINATION_PAGE: 'page',
  PAGINATION_SIZE: 'size',
  SEARCH: 'search',
  FILTERS: 'filters',
};

type Filter = {
  field: string;
  comparer: ComparerType;
  value: any;
};

type State = {
  selection: any[];

  page: number;
  size: number;
  search: string;
  filters: Filter[];
};

export type FetchEventDetail = State;

const style = createCSSSheet(css`
  .searchbar {
    display: flex;
    align-items: center;
    gap: 1em;
    margin-block-end: calc(1 * ${theme.gridGutter});
  }
  .search {
    border-width: 2px;
  }
  .filters {
    display: flex;
    flex-grow: 1;
    gap: 1em;
    width: 0;
    white-space: nowrap;
  }
  .comparer {
    color: ${theme.primaryColor};
  }
  .pagination {
    margin-block-start: ${theme.gridGutter};
  }
`);

/**
 * @customElement dy-pat-table
 */
@customElement('dy-pat-table')
@adoptedStyle(style)
@adoptedStyle(blockContainer)
// 只有使用 dy-pat-console 才起作用
@connectStore(locationStore)
export class DyPatTableElement<T = any> extends GemElement<State> {
  @refobject tableRef: RefObject<DuoyunTableElement<T>>;

  @boolattribute filterable: boolean;
  @boolattribute selectable: boolean;

  // 默认 pagesize
  @numattribute pagesize: number;
  @property sizes?: number[];

  @property data?: T[] | (T | undefined)[];
  @property paginationStore?: Store<PaginationStore<T>>;

  @property rowKey?: string | string[];
  @property getRowStyle?: (record: T) => Partial<CSSStyleDeclaration>;
  @property getSelectedActions?: (selections: any[]) => ContextMenuItem[];
  @property expandedRowRender?: (record: T) => undefined | string | TemplateResult;

  @emitter expand: Emitter<T>;

  @emitter fetch: Emitter<FetchEventDetail>;

  @property columns: FilterableColumn<T>[] = [];

  @property getText: (
    key:
      | 'filter'
      | 'removeSelection'
      | 'addSelection'
      | 'addPageAllSelection'
      | 'addAllSelection'
      | 'removeAllSelection'
      | ComparerType,
  ) => string = (e) => e.replace(/[A-Z]/g, ' $1').replace(/^\w/, ($1) => $1.toUpperCase());

  get #defaultPagesize() {
    return this.pagesize || this.sizes?.[0] || 20;
  }

  get #defaultPage() {
    return 1;
  }

  state: State = (() => {
    const p = history.getParams();
    const page = Number(p.query.get(queryKeys.PAGINATION_PAGE)) || this.#defaultPage;
    const size = Number(p.query.get(queryKeys.PAGINATION_SIZE)) || this.#defaultPagesize;
    const search = p.query.get(queryKeys.SEARCH) || '';
    const filters = p.query.getAnyAll(queryKeys.FILTERS);
    return { search, filters, selection: [], page, size };
  })();

  #data?: (T | undefined)[] = [];

  #getRanges = (root: Node, text: string) => {
    const reg = new RegExp([...text].map((c) => `\\u{${c.codePointAt(0)!.toString(16)}}`).join(''), 'gui');
    const ranges: Range[] = [];
    const nodes: Node[] = [root];
    while (!!nodes.length) {
      const node = nodes.pop()!;
      switch (node.nodeType) {
        case Node.TEXT_NODE:
          const matched = node.nodeValue?.matchAll(reg);
          if (matched) {
            for (const arr of matched) {
              if (arr.index !== undefined) {
                const range = new Range();
                range.setStart(node, arr.index);
                range.setEnd(node, arr.index + text.length);
                ranges.push(range);
              }
            }
          }
          break;
        case Node.ELEMENT_NODE:
          if ((node as Element).shadowRoot) nodes.push((node as Element).shadowRoot as Node);
          break;
      }
      if (node.childNodes[0]) nodes.push(node.childNodes[0]);
      if (node.nextSibling) nodes.push(node.nextSibling);
    }
    return ranges;
  };

  #onSelect = (evt: CustomEvent) => this.setState({ selection: evt.detail });

  #onItemContextMenu = (evt: CustomEvent<ItemContextMenuEventDetail<T>>) => {
    if (!this.selectable) return;
    const { selection } = this.state;
    const { data, originEvent, selected } = evt.detail;
    const table = evt.target as DuoyunTableElement<T>;
    originEvent.preventDefault();
    const unSelectionMenu: ContextMenuItem[] = [
      selected
        ? {
            text: this.getText('removeSelection'),
            handle: () => table.removeSelection([data]),
          }
        : {
            text: this.getText('addSelection'),
            handle: () => table.appendSelection([data]),
          },
      {
        text: this.getText('addPageAllSelection'),
        handle: () => table.appendSelection(this.#getPageData().data || []),
      },
      !this.paginationStore && {
        text: this.getText('addAllSelection'),
        handle: () => table.appendSelection(this.data || []),
      },
    ].filter(isNotBoolean);
    ContextMenu.open(
      selection.length
        ? [
            {
              text: this.getText('removeAllSelection'),
              handle: () => this.setState({ selection: [] }),
            },
            ...unSelectionMenu,
            {
              text: '---',
            },
            ...(this.getSelectedActions?.(selection) || []).map((item) => ({
              ...item,
              handle: async () => {
                await item.handle?.();
                this.setState({ selection: [] });
              },
            })),
          ]
        : unSelectionMenu,
      {
        x: originEvent.x,
        y: originEvent.y,
      },
    );
  };

  #getPageData = () => {
    const { query } = history.getParams();
    const page = Number(query.get(queryKeys.PAGINATION_PAGE)) || this.#defaultPage;
    const size = Number(query.get(queryKeys.PAGINATION_SIZE)) || this.#defaultPagesize;

    const total = this.paginationStore
      ? this.paginationStore.total
      : this.#data
        ? Math.ceil(this.#data.length / size)
        : 0;
    const data = this.paginationStore
      ? this.paginationStore.pagination[page]?.ids?.map((id) => this.paginationStore!.items[id])
      : this.#data?.slice((page - 1) * size, page * size);
    return { total, data, size, page };
  };

  #createChangeFunction = (key: string, getDefaultValue: () => number, updateState: (v: number) => void) => {
    return ({ detail }: CustomEvent<number>) => {
      const p = history.getParams();
      const query = new QueryString(p.query);
      if (detail === getDefaultValue()) {
        query.delete(key);
      } else {
        query.set(key, String(detail));
      }
      updateState(detail);
      history.push({ ...p, query });
      findScrollContainer(this)?.scrollTo(0, 0);
      this.fetch(this.state);
    };
  };

  #onPageChange = this.#createChangeFunction(
    queryKeys.PAGINATION_PAGE,
    () => this.#defaultPage,
    (v) => this.setState({ page: v }),
  );
  #onSizeChange = this.#createChangeFunction(
    queryKeys.PAGINATION_SIZE,
    () => this.#defaultPagesize,
    (v) => this.setState({ size: v }),
  );

  #changeQuery = () => {
    const p = history.getParams();
    const query = new QueryString(p.query);
    query.setAny(queryKeys.SEARCH, this.state.search);
    query.setAny(queryKeys.FILTERS, this.state.filters);
    query.delete(queryKeys.PAGINATION_PAGE);
    query.delete(queryKeys.PAGINATION_SIZE);
    this.setState({ page: this.#defaultPage, size: this.#defaultPagesize });
    history.replace({ ...p, query, hash: '' });
    this.fetch(this.state);
  };

  #changeQueryThrottle = throttle(this.#changeQuery, 120);

  #onSearch = (evt: CustomEvent<string>) => {
    this.setState({ search: evt.detail });
    this.#changeQueryThrottle();
    evt.stopPropagation();
  };

  #onKeydown = (evt: KeyboardEvent) => {
    hotkeys({
      esc: () => {
        this.setState({ search: '' });
        this.#changeQueryThrottle();
      },
    })(evt);
  };

  #onAddFilter = (data: Filter) => {
    ContextMenu.close();
    this.setState({ filters: [...this.state.filters, data] });
    this.#changeQuery();
  };

  #onRemoveFilter = (index: number) => {
    this.state.filters.splice(index, 1);
    this.#changeQuery();
  };

  #onOpenFilter = (e: MouseEvent) => {
    ContextMenu.open(
      this.columns
        .filter(({ title, dataIndex, data }) => title && (data?.field || dataIndex))
        .map(({ title, dataIndex, data }) => ({
          text: getStringFromTemplate(title),
          menu: html`
            <dy-pat-filter-form
              .getText=${this.getText}
              .options=${data}
              @submit=${({ detail }: CustomEvent) => this.#onAddFilter({ ...detail, field: data?.field || dataIndex })}
            ></dy-pat-filter-form>
          `,
        })),
      { activeElement: e.target as DuoyunButtonElement },
    );
  };

  #filterFieldLabelMap: Record<string, string> = {};
  #filterFieldTypeMap: Record<string, FilterableType | undefined> = {};
  #filterFieldEnumMap: Record<string, Record<string, string>> = {};

  #getValueFromField = (field: string, value: any | any[]) => {
    return [].concat(value).map((e) => {
      switch (this.#filterFieldTypeMap[field]) {
        case 'time':
          return new Time(Number(e)).format('YYYY-MM-DD');
        case 'duration':
          return formatDuration(e);
        default:
          return this.#filterFieldEnumMap[field]?.[e] || e;
      }
    });
  };

  willMount = () => {
    this.effect(
      () => this.paginationStore && connect(this.paginationStore, this.update),
      () => [this.paginationStore],
    );
    // 显示正确的过滤器文本
    this.memo(
      () => {
        this.columns.forEach(({ title, dataIndex, data }) => {
          const field = String(data?.field || dataIndex);
          this.#filterFieldLabelMap[field] = typeof title === 'string' ? title : getStringFromTemplate(title);
          this.#filterFieldTypeMap[field] = data?.type;
          const enums = data?.getOptions?.('');
          if (enums) {
            this.#filterFieldEnumMap[field] = convertToMap(enums, 'value', 'label');
          }
        });
      },
      () => [this.columns],
    );
    // 搜索和过滤，如果是 lazy，则由用户处理
    this.memo(
      ([query]) => {
        this.#data = this.data;
        if (this.paginationStore) return;
        if (!this.#data) return;
        const search = query.get(queryKeys.SEARCH);
        if (search) {
          this.#data = this.#data.filter((e) => {
            if (!e) return true;
            const str = this.columns
              .filter(({ title }) => !!title)
              .map(({ dataIndex, render, data }) => {
                if (data?.getSearchText) return data.getSearchText(e);
                if (dataIndex) return readProp(e, dataIndex);
                if (render) {
                  const result = render(e);
                  return typeof result === 'string' ? result : '';
                }
                return '';
              })
              .join();
            return isIncludesString(str, search);
          });
        }
        const filters = query.getAnyAll(queryKeys.FILTERS) as Filter[];
        filters.forEach(() => {
          this.#data = this.#data?.filter((e) => {
            return filters.every(({ field, comparer: comparerType, value }) => {
              if (!e) return true;
              if (Array.isArray(value)) {
                const fieldValue = readProp(e, field);
                if (Array.isArray(fieldValue)) return fieldValue.some((e) => comparer(value, comparerType, e));
                return comparer(value, comparerType, fieldValue);
              }
              return comparer(
                String(readProp(e, field) || '').toLowerCase(),
                comparerType,
                String(value || '').toLowerCase(),
              );
            });
          });
        });
      },
      () => [locationStore.query, this.columns, this.data] as const,
    );
  };

  mounted = () => {
    this.fetch(this.state);
    // 高亮搜索词
    this.effect(
      async ([search]) => {
        await sleep(1);
        const Highlight = (window as any).Highlight;
        const highlights = (CSS as any).highlights;
        if (!Highlight || !highlights) return;

        if (!search) return highlights.clear();

        const tbody = this.tableRef.element?.shadowRoot?.querySelector('tbody');
        if (!tbody) return;

        const highlight = new Highlight();
        splitString(search).forEach((s) => {
          this.#getRanges(tbody, s).forEach((range) => highlight.add(range));
        });
        highlights.set('search', highlight);
      },
      () => [this.state.search],
    );
  };

  render = () => {
    const { data, page, size, total } = this.#getPageData();

    return html`
      <div class="searchbar" part="searchbar">
        <dy-input
          class="search"
          type="search"
          placeholder=${locale.search}
          clearable
          @clear=${this.#onSearch}
          @change=${this.#onSearch}
          @keydown=${this.#onKeydown}
          .value=${this.state.search}
        ></dy-input>
        ${this.filterable
          ? html`
              <dy-button color="cancel" @click=${this.#onOpenFilter} .icon=${icons.filter}>
                ${this.getText('filter')}
              </dy-button>
            `
          : ''}
        <dy-scroll-box class="filters" part="filters">
          ${this.state.filters.map(
            ({ field, value, comparer }, index) => html`
              <dy-tag @close=${() => this.#onRemoveFilter(index)} closable>
                <span>${this.#filterFieldLabelMap[field]}</span>
                <span class="comparer">${this.getText(comparer)}</span>
                <span>"${this.#getValueFromField(field, value).join(', ')}"</span>
              </dy-tag>
            `,
          )}
        </dy-scroll-box>
        <slot></slot>
      </div>
      <dy-table
        ref=${this.tableRef.ref}
        part="table-wrap"
        exportparts="table,tr,td,th"
        .getRowStyle=${this.getRowStyle}
        .expandedRowRender=${this.expandedRowRender}
        .data=${data}
        .columns=${this.columns}
        .selectable=${this.selectable}
        .rowKey=${this.rowKey}
        .selection=${this.state.selection}
        @select=${this.#onSelect}
        @expand=${(evt: CustomEvent) => this.expand(evt.detail)}
        @itemcontextmenu=${this.#onItemContextMenu}
      ></dy-table>
      <dy-pagination
        class="pagination"
        part="pagination"
        @pagechange=${this.#onPageChange}
        @sizechange=${this.#onSizeChange}
        .page=${page}
        .size=${size}
        .sizes=${this.sizes && this.sizes.length > 1 ? this.sizes : undefined}
        .total=${total}
      ></dy-pagination>
    `;
  };
}
