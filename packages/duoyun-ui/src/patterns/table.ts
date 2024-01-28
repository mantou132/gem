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
  ComparerType,
  getStringFromTemplate,
  convertToMap,
} from '../lib/utils';
import { sleep, throttle } from '../lib/timer';
import type { Column, ItemContextMenuEventDetail, DuoyunTableElement } from '../elements/table';
import { blockContainer } from '../lib/styles';
import { findRanges, findScrollContainer } from '../lib/element';
import { Time, formatDuration } from '../lib/time';
import type { DuoyunButtonElement } from '../elements/button';
import { locale } from '../lib/locale';
import { icons } from '../lib/icons';
import { isNotBoolean } from '../lib/types';
import { hotkeys } from '../lib/hotkeys';
import { PaginationStore } from '../helper/store';
import { DuoyunRouteElement } from '../elements/route';

import { locationStore } from './console';
import type { FilterableOptions, FilterableType } from './filter-form';

import '../elements/input';
import '../elements/button';
import '../elements/tag';
import '../elements/table';
import '../elements/pagination';
import '../elements/scroll-box';
import '../elements/loading';

import './filter-form';

export type FilterableColumn<T> = Column<T> & {
  data?: FilterableOptions & {
    field?: keyof T | string[];
    getSearchText?: (e: T) => string;
  };
};

// 不能和外部冲突
const queryKeys = {
  PAGINATION_PAGE: '_dy_page',
  PAGINATION_SIZE: '_dy_size',
  SEARCH: '_dy_search',
  FILTERS: '_dy_filters',
};

type Filter = {
  field: string;
  comparer: ComparerType;
  value: any;
};

type State = {
  selection: any[];
  search: string;
  filters: Filter[];
};

type LocationStore = Store<ReturnType<(typeof DuoyunRouteElement)['createLocationStore']>>;

export type FetchEventDetail = LocationStore & {
  page: number;
  size: number;
  search: string;
  filters: Filter[];
  searchAndFilterKey: string;
};

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
  .updating {
    position: fixed;
    right: 1rem;
    bottom: 1rem;
  }
`);

/**
 * @customElement dy-pat-table
 */
@customElement('dy-pat-table')
@adoptedStyle(style)
@adoptedStyle(blockContainer)
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

  // 如果不在 dy-pat-console 中，则需要提供 `locationStore`
  @property locationStore?: LocationStore;

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
  ) => string = (e) => e.replace(/([A-Z])/g, ' $1').replace(/^\w/, ($1) => $1.toUpperCase());

  get #defaultPagesize() {
    return this.pagesize || this.sizes?.[0] || 20;
  }

  get #defaultPage() {
    return 1;
  }

  get #page() {
    return Number(history.getParams().query.get(queryKeys.PAGINATION_PAGE)) || this.#defaultPage;
  }

  get #size() {
    return Number(history.getParams().query.get(queryKeys.PAGINATION_SIZE)) || this.#defaultPagesize;
  }

  get #search() {
    return history.getParams().query.get(queryKeys.SEARCH) || '';
  }

  get #filters() {
    return history.getParams().query.getAnyAll(queryKeys.FILTERS);
  }

  state: State = {
    selection: [],
    search: this.#search,
    filters: this.#filters,
  };

  #data?: (T | undefined)[] = [];

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
        handle: () => table.appendSelection(this.#data || []),
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
    const page = this.#page;
    const size = this.#size;

    const total = this.paginationStore
      ? this.paginationStore.total
      : this.#data
        ? Math.ceil(this.#data.length / size)
        : 0;
    const pageData = this.paginationStore?.pagination[page];

    const data = pageData
      ? pageData?.ids?.map((id) => this.paginationStore!.items[id])
      : this.#data?.slice((page - 1) * size, page * size);

    const updating = data && pageData?.loading;

    return { total, data, size, page, updating };
  };

  #createChangeFunction = (key: string, getDefaultValue: () => number) => {
    return ({ detail }: CustomEvent<number>) => {
      const p = history.getParams();
      const query = new QueryString(p.query);
      if (detail === getDefaultValue()) {
        query.delete(key);
      } else {
        query.set(key, String(detail));
      }
      history.push({ ...p, query });
      findScrollContainer(this)?.scrollTo(0, 0);
    };
  };

  #onPageChange = this.#createChangeFunction(queryKeys.PAGINATION_PAGE, () => this.#defaultPage);
  #onSizeChange = this.#createChangeFunction(queryKeys.PAGINATION_SIZE, () => this.#defaultPagesize);

  #changeQuery = () => {
    const p = history.getParams();
    const query = new QueryString(p.query);
    query.setAny(queryKeys.SEARCH, this.state.search);
    query.setAny(queryKeys.FILTERS, this.state.filters);
    query.delete(queryKeys.PAGINATION_PAGE);
    query.delete(queryKeys.PAGINATION_SIZE);
    history.replace({ ...p, query, hash: '' });
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
    // 搜索和过滤数据，如果服务端分页，则跳过
    this.memo(
      () => {
        this.#data = this.data;
        if (this.paginationStore) return;
        if (!this.#data) return;
        const { search, filters } = this.state;
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
      () => [(this.locationStore || locationStore).query, this.columns, this.data],
    );
  };

  mounted = () => {
    this.effect(
      () => this.paginationStore && connect(this.paginationStore, this.update),
      () => [this.paginationStore],
    );
    this.effect(
      () => this.locationStore && connect(this.locationStore, this.update),
      () => [this.locationStore],
    );
    this.effect(
      () => {
        const { search, filters } = this.state;
        this.fetch({
          search,
          filters,
          page: this.#page,
          size: this.#size,
          ...locationStore,
          ...this.locationStore,
          searchAndFilterKey:
            search || filters.length
              ? `${search}-${filters
                  .sort((a, b) => (a.field > b.field ? 1 : 0))
                  .map(({ field, comparer, value }) => `${field}-${comparer}-${value}`)
                  .join()}`
              : '',
        });
      },
      () => {
        const { path, query } = this.locationStore || locationStore;
        return [
          this.paginationStore?.updatedItem,
          query.get(queryKeys.PAGINATION_PAGE),
          query.get(queryKeys.PAGINATION_SIZE),
          query.get(queryKeys.FILTERS),
          query.get(queryKeys.SEARCH),
          path,
        ];
      },
    );
    // 高亮搜索词
    this.effect(
      async () => {
        await sleep(1);
        const { search } = this.state;
        const Highlight = (window as any).Highlight;
        const highlights = (CSS as any).highlights;
        if (!Highlight || !highlights) return;

        if (!search) return highlights.clear();

        const tbody = this.tableRef.element?.shadowRoot?.querySelector('tbody');
        if (!tbody) return;

        const highlight = new Highlight();
        splitString(search).forEach((s) => {
          findRanges(tbody, s).forEach((range) => highlight.add(range));
        });
        highlights.set('search', highlight);
      },
      // search 进行了节流，所以是依赖 query
      () => [this.paginationStore ? this.paginationStore.pagination[this.#page]?.ids : this.#search],
    );
  };

  render = () => {
    const { data, page, size, total, updating } = this.#getPageData();

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
      <dy-loading class="updating" ?hidden=${!updating}></dy-loading>
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
