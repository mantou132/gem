import { css, createRef, createState, GemElement, html } from '@mantou/gem/lib/element';
import { QueryString, addListener, styleMap } from '@mantou/gem/lib/utils';
import type { Emitter } from '@mantou/gem/lib/decorators';
import {
  adoptedStyle,
  boolattribute,
  connectStore,
  customElement,
  effect,
  emitter,
  memo,
  numattribute,
  property,
  shadow,
} from '@mantou/gem/lib/decorators';
import { history } from '@mantou/gem/lib/history';
import type { Store } from '@mantou/gem/lib/store';
import { connect } from '@mantou/gem/lib/store';

import type { ContextMenuItem } from '../elements/contextmenu';
import { ContextMenu } from '../elements/contextmenu';
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
import { closestElement, findRanges, findScrollContainer } from '../lib/element';
import { Time, formatDuration } from '../lib/time';
import type { DuoyunButtonElement } from '../elements/button';
import { locale } from '../lib/locale';
import { icons } from '../lib/icons';
import { isNotBoolean } from '../lib/types';
import { hotkeys } from '../lib/hotkeys';
import type { PaginationStore } from '../helper/store';
import type { DuoyunRouteElement } from '../elements/route';
import type { DuoyunTagElement } from '../elements/tag';
import type { DuoyunScrollBoxElement } from '../elements/scroll-box';

import { locationStore } from './console';
import type { FilterableOptions, SubmitValue } from './filter-form';

import '../elements/input';
import '../elements/button';
import '../elements/tag';
import '../elements/table';
import '../elements/pagination';
import '../elements/scroll-box';
import '../elements/loading';

import './filter-form';

export type PatTableColumn<T> = Column<T> & {
  sortable?: boolean;
  filterOptions?:
    | false
    | (FilterableOptions & {
        field?: keyof T | string[];
        /**menu width */
        width?: string;
        /**local search */
        getSearchText?: (e: T) => string;
        /**local compare */
        getCompareValue?: (e: T) => any;
      });
};

export type SelectedActions<T> = (ContextMenuItem & { handle?: (data?: T) => void | Promise<void> })[];

// 不能和外部冲突
const queryKeys = {
  PAGINATION_PAGE: '_dy_page',
  PAGINATION_SIZE: '_dy_size',
  SEARCH: '_dy_search',
  FILTERS: '_dy_filters',
  SORT: '_dy_sort',
};

type Filter = {
  field: string;
  cType: ComparerType;
  value: any;
};

type Sort = 'asc' | 'des';

function getNextSort(current?: Sort): Sort | undefined {
  switch (current) {
    case 'asc':
      return 'des';
    case 'des':
      return;
    default:
      return 'asc';
  }
}

type State = {
  selection: any[];
  search: string;
  filters: Filter[];
  sort: Record<string, Sort | undefined>;
};

type LocationStore = Store<ReturnType<(typeof DuoyunRouteElement)['createLocationStore']>>;

export type FetchEventDetail = Omit<LocationStore, ''> & {
  page: number;
  size: number;
  search: string;
  filters: Filter[];
  pageKey: string;
  sort: Record<string, Sort | undefined>;
};

const style = css`
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
    position: relative;
    display: flex;
    flex-grow: 1;
    gap: 1em;
    width: 0;
    white-space: nowrap;
  }
  .comparer {
    color: ${theme.highlightColor};
  }
  .pagination {
    margin-block-start: ${theme.gridGutter};
  }
  .updating {
    position: fixed;
    right: 1rem;
    bottom: 1rem;
  }
`;

/**
 * !WARNING
 *
 * field not contain `,`, `filters` field and `sort` key use `,` split
 */
@customElement('dy-pat-table')
@adoptedStyle(style)
@adoptedStyle(blockContainer)
@connectStore(locationStore)
@shadow()
export class DyPatTableElement<T = any> extends GemElement {
  @boolattribute filterable: boolean;
  @boolattribute selectable: boolean;

  // 默认 pagesize
  @numattribute pagesize: number;
  @property sizes?: number[];

  @property data?: T[] | (T | undefined)[];
  @property paginationStore?: Store<PaginationStore<T>>;

  // 如果不在 dy-pat-console 中，则需要提供 `locationStore`
  @property locationStore?: LocationStore;

  @property rowKey?: DuoyunTableElement['rowKey'];
  @property getRowStyle?: DuoyunTableElement['getRowStyle'];
  @property expandedRowRender?: DuoyunTableElement['expandedRowRender'];
  @property getActions?: DuoyunTableElement['getActions'];
  @property getSelectedActions?: (selections: any[]) => SelectedActions<T>;

  @emitter expand: Emitter<T>;

  @emitter fetch: Emitter<FetchEventDetail>;

  @property columns: PatTableColumn<T>[] = [];

  @property getText: (
    key:
      | 'filter'
      | 'removeItemFromSelection'
      | 'removeAllSelection'
      | 'addToSelection'
      | 'addPageAllToSelection'
      | 'addAllToSelection'
      | ComparerType,
  ) => string = (e) => e.replace(/([A-Z])/g, ' $1').replace(/^\w/, ($1) => $1.toUpperCase());

  #tableRef = createRef<DuoyunTableElement<T>>();

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

  get #sort() {
    return history.getParams().query.getAny(queryKeys.SORT) || {};
  }

  #state = createState<State>({
    selection: [],
    search: this.#search,
    filters: this.#filters,
    sort: this.#sort,
  });

  #data?: (T | undefined)[] = [];

  #onSelect = (evt: CustomEvent) => this.#state({ selection: evt.detail });

  #onContextMenu = (originEvent: MouseEvent, currentRowData?: T, selected?: boolean) => {
    if (originEvent.altKey) return;
    if (!this.selectable) return;
    const table = this.#tableRef.value!;
    const { selection } = this.#state;
    originEvent.stopPropagation();
    originEvent.preventDefault();
    const currentRowMenu: ContextMenuItem[] = !currentRowData
      ? []
      : [
          selected
            ? {
                text: this.getText('removeItemFromSelection'),
                handle: () => table.removeSelection([currentRowData]),
              }
            : {
                text: this.getText('addToSelection'),
                handle: () => table.appendSelection([currentRowData]),
              },
        ];
    const unSelectionMenu: ContextMenuItem[] = [
      ...currentRowMenu,
      {
        text: this.getText('addPageAllToSelection'),
        handle: () => table.appendSelection(this.#getPageData().data || []),
      },
      !this.paginationStore && {
        text: this.getText('addAllToSelection'),
        handle: () => table.appendSelection(this.#data || []),
      },
    ].filter(isNotBoolean);
    const userCustomMenu = this.getSelectedActions?.(selection);

    ContextMenu.open(
      selection.length
        ? [
            {
              text: this.getText('removeAllSelection'),
              handle: () => this.#state({ selection: [] }),
            },
            ...currentRowMenu,
            ...(userCustomMenu ? [{ text: '---' }, ...userCustomMenu] : []).map((item) => ({
              ...item,
              handle: async () => {
                await item.handle?.(currentRowData);
                this.#state({ selection: [] });
              },
            })),
          ]
        : unSelectionMenu,
      {
        activeElement: originEvent.target as HTMLTableRowElement,
        x: originEvent.x,
        y: originEvent.y,
      },
    );
  };

  #onItemContextMenu = (evt: CustomEvent<ItemContextMenuEventDetail<T>>) => {
    const { data, originEvent, selected } = evt.detail;
    this.#onContextMenu(originEvent, data, selected);
  };

  #getPageData = () => {
    const page = this.#page;
    const size = this.#size;

    const total = this.paginationStore
      ? this.paginationStore.total
      : this.#data
        ? Math.ceil(this.#data.length / size)
        : 0;

    const data = this.paginationStore
      ? this.paginationStore.getData(page)
      : this.#data?.slice((page - 1) * size, page * size);

    const updating =
      data &&
      (this.paginationStore
        ? this.paginationStore.isLoading(page)
        : // 只有一个全局数据请求，简单起见，不显示更新标识
          false);

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
    query.setAny(queryKeys.SEARCH, this.#state.search);
    query.setAny(queryKeys.FILTERS, this.#state.filters);
    query.delete(queryKeys.PAGINATION_PAGE);
    query.delete(queryKeys.PAGINATION_SIZE);
    history.replace({ ...p, query, hash: '' });
  };

  #changeQueryThrottle = throttle(this.#changeQuery, 120);

  #onSearch = (evt: CustomEvent<string>) => {
    this.#state({ search: evt.detail });
    this.#changeQueryThrottle();
    evt.stopPropagation();
  };

  #onKeydown = (evt: KeyboardEvent) => {
    hotkeys({
      esc: () => {
        this.#state({ search: '' });
        this.#changeQueryThrottle();
      },
    })(evt);
  };

  #onSwitchSort = (field: string) => {
    const { sort } = this.#state;
    const newSort = { ...sort };
    delete newSort[field];
    this.#state({ sort: { ...newSort, [field]: getNextSort(sort[field]) } });
    const p = history.getParams();
    const query = new QueryString(p.query);
    if (JSON.stringify(this.#state.sort) === '{}') {
      query.delete(queryKeys.SORT);
    } else {
      query.setAny(queryKeys.SORT, this.#state.sort);
    }
    history.replace({ ...p, query });
  };

  #onAddFilter = (data: Filter) => {
    ContextMenu.close();
    this.#state({ filters: [...this.#state.filters, data] });
    this.#changeQuery();
  };

  #onRemoveFilter = (index: number) => {
    this.#state.filters.splice(index, 1);
    this.#changeQuery();
  };

  #onModifyFilter = (index: number, data: Filter) => {
    ContextMenu.close();
    this.#state.filters.splice(index, 1, data);
    this.#changeQuery();
  };

  #getMenuWidth = ({ filterOptions }: PatTableColumn<T>) => {
    if (filterOptions === false) return;
    if (filterOptions?.width) return filterOptions?.width;
    switch (filterOptions?.type) {
      case 'date-time':
        return '26em';
      default:
        return '15em';
    }
  };

  #getFilterField = ({ filterOptions, dataIndex }: PatTableColumn<T>) => {
    return filterOptions === false ? '' : String(filterOptions?.field || dataIndex);
  };

  #onClickFilter = (evt: PointerEvent, index: number) => {
    const { field, cType, value } = this.#state.filters[index];
    const column = this.columns.find((col) => this.#getFilterField(col) === field)!;
    const tagEle = evt.currentTarget as DuoyunTagElement;
    const offsetEle = tagEle.offsetParent as DuoyunScrollBoxElement;
    ContextMenu.open(
      html`
        <dy-pat-filter-form
          .getText=${this.getText}
          .options=${column.filterOptions || undefined}
          .initValue=${{ comparerType: cType, value }}
          @submit=${({ detail }: CustomEvent<SubmitValue>) =>
            this.#onModifyFilter(index, { cType: detail.comparerType, value: detail.value, field })}
        ></dy-pat-filter-form>
      `,
      {
        activeElement: tagEle.offsetLeft > offsetEle.scrollLeft ? tagEle : offsetEle,
        width: this.#getMenuWidth(column),
      },
    );
  };

  #onOpenFilter = (e: PointerEvent) => {
    ContextMenu.open(
      this.columns
        .filter((column) => column.title && !!this.#getFilterField(column))
        .map((column) => ({
          text: getStringFromTemplate(column.title),
          menu: {
            width: this.#getMenuWidth(column),
            menu: html`
              <dy-pat-filter-form
                .getText=${this.getText}
                .options=${column.filterOptions || undefined}
                @submit=${({ detail }: CustomEvent<SubmitValue>) =>
                  this.#onAddFilter({
                    cType: detail.comparerType,
                    value: detail.value,
                    field: this.#getFilterField(column),
                  })}
              ></dy-pat-filter-form>
            `,
          },
        })),
      { activeElement: e.currentTarget as DuoyunButtonElement },
    );
  };

  #getValueFromField = (field: string, value: any | any[]) => {
    return [].concat(value).map((e) => {
      const filterOptions = this.#filterFieldOptionsMap[field];
      switch (filterOptions && filterOptions?.type) {
        case 'date':
          return new Time(Number(e)).format('YYYY-MM-DD');
        case 'date-time':
          return new Time(Number(e)).format();
        case 'time':
          return formatDuration(e, true);
        case 'duration':
          return formatDuration(e);
        default:
          return this.#filterFieldEnumMap[field]?.[e] || e;
      }
    });
  };

  #selectionContainer?: HTMLElement;

  @memo((i) => [i.selectable])
  #setSelectionContainer = () => {
    this.#selectionContainer = (this.selectable && closestElement(this, 'main')) || undefined;
  };

  #columns: PatTableColumn<T>[] = [];

  @memo((i) => [i.columns, i.#state.sort])
  #setColumns = () => {
    const { sort } = this.#state;
    this.#columns = this.columns.map(
      (column, _index, _arr, field = String(column.dataIndex), status = sort[field]) => ({
        ...column,
        title:
          column.sortable && column.title && column.dataIndex
            ? html`
                <div
                  style=${styleMap({ cursor: 'pointer', display: 'flex', gap: '.3em' })}
                  @click=${() => this.#onSwitchSort(field)}
                >
                  ${column.title}
                  <dy-use style="width: 1em" .element=${icons.sort}>
                    <style>
                      @scope {
                        :scope::part(up),
                        :scope::part(down) {
                          opacity: 0.2;
                        }
                        :scope::part(${!status ? '' : status === 'asc' ? 'up' : 'down'}) {
                          opacity: 1;
                        }
                      }
                    </style>
                  </dy-use>
                </div>
              `
            : column.title,
      }),
    );
  };

  #filterFieldOptionsMap: Record<string, PatTableColumn<T>['filterOptions']> = {};
  #filterFieldLabelMap: Record<string, string> = {};
  #filterFieldEnumMap: Record<string, Record<string, string>> = {};

  // 显示正确的过滤器文本
  @memo((i) => [i.columns])
  #setFilterFieldEnumMap = () => {
    this.columns.forEach((column) => {
      const { title, filterOptions } = column;
      const field = this.#getFilterField(column);
      this.#filterFieldOptionsMap[field] = filterOptions;
      this.#filterFieldLabelMap[field] = typeof title === 'string' ? title : getStringFromTemplate(title);
      const enums = filterOptions && filterOptions.getOptions?.('');
      if (enums) {
        this.#filterFieldEnumMap[field] = convertToMap(enums, 'value', 'label');
      }
    });
  };

  // 搜索和过滤数据，如果服务端分页，则跳过
  @memo((i) => [(i.locationStore || locationStore).query, i.columns, i.data])
  #setData = () => {
    this.#data = this.data;
    if (this.paginationStore) return;
    if (!this.#data) return;
    const { search, filters, sort } = this.#state;
    if (search) {
      this.#data = this.#data.filter((e) => {
        if (!e) return true;
        const str = this.columns
          .filter(({ title }) => !!title)
          .map(({ dataIndex, render, filterOptions }) => {
            if (filterOptions && filterOptions.getSearchText) return filterOptions.getSearchText(e);
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
    this.#data = this.#data?.filter((filter) => {
      return filters.every(({ field, cType, value }) => {
        if (!filter) return true;
        const filterOptions = this.#filterFieldOptionsMap[field];
        const fieldValue =
          filterOptions && filterOptions.getCompareValue
            ? filterOptions.getCompareValue(filter)
            : readProp(filter, field.split(','));
        if (Array.isArray(value)) {
          if (Array.isArray(fieldValue)) return fieldValue.some((e) => comparer(value, cType, e));
          return comparer(value, cType, fieldValue);
        }
        return comparer(String(fieldValue || '').toLowerCase(), cType, String(value || '').toLowerCase());
      });
    });
    Object.entries(sort).forEach(([field, sortType]) => {
      if (!sortType) return;
      this.#data?.sort((a, b) => {
        if (!a || !b) return 0;
        const [aa, bb] = sortType === 'asc' ? [a, b] : [b, a];
        const dataIndex = field.split(',');
        return comparer(readProp(aa, dataIndex), ComparerType.Gte, readProp(bb, dataIndex)) ? 1 : -1;
      });
    });
  };

  @effect((i) => [i.selectable])
  #addListener = () => {
    if (this.#selectionContainer) {
      return addListener(this.#selectionContainer, 'contextmenu', this.#onContextMenu);
    }
  };

  @effect((i) => [i.paginationStore])
  #connectPaginationStore = () => this.paginationStore && connect(this.paginationStore, this.update);

  @effect((i) => [i.locationStore])
  #connectLocationStore = () => this.locationStore && connect(this.locationStore, this.update);

  #getEmitterEventDeps = () => {
    const { path, query } = this.locationStore || locationStore;
    return [
      this.paginationStore?.updatedItem,
      query.get(queryKeys.PAGINATION_PAGE),
      query.get(queryKeys.PAGINATION_SIZE),
      query.get(queryKeys.FILTERS),
      query.get(queryKeys.SORT),
      query.get(queryKeys.SEARCH),
      path,
    ];
  };

  @effect((i) => i.#getEmitterEventDeps())
  #emitterEvent = () => {
    const { search, filters, sort } = this.#state;
    const sorts = Object.entries(sort).filter(([_, v]) => v);
    this.fetch({
      sort,
      search,
      filters,
      page: this.#page,
      size: this.#size,
      ...locationStore,
      ...this.locationStore,
      pageKey:
        search || filters.length || sorts.length
          ? `${search}-${filters
              .sort((a, b) => (a.field > b.field ? 1 : 0))
              .map(({ field, cType, value }) => `${field}-${cType}-${value}`)
              .join()}-${sorts
              .sort(([k], [kk]) => (k > kk ? 1 : 0))
              .map((e) => e.join('-'))
              .join()}`
          : '',
    });
  };

  // search 进行了节流，所以是依赖 query
  @effect((i) => [i.paginationStore ? i.paginationStore.pagination[i.#page]?.ids : i.#search])
  #setHighlights = async () => {
    await sleep(1);
    const { search } = this.#state;
    const Highlight = (window as any).Highlight;
    const highlights = (CSS as any).highlights;
    if (!Highlight || !highlights) return;

    if (!search) return highlights.clear();

    const tbody = this.#tableRef.value?.shadowRoot?.querySelector('tbody');
    if (!tbody) return;

    const highlight = new Highlight();
    splitString(search).forEach((s) => {
      findRanges(tbody, s).forEach((range) => highlight.add(range));
    });
    highlights.set('search', highlight);
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
          .value=${this.#state.search}
        ></dy-input>
        ${this.filterable
          ? html`
              <dy-button color="cancel" @click=${this.#onOpenFilter} .icon=${icons.filter}>
                ${this.getText('filter')}
              </dy-button>
            `
          : ''}
        <dy-scroll-box class="filters" part="filters">
          ${this.#state.filters.map(
            ({ field, value, cType }, index) => html`
              <dy-tag
                @pointerdown=${(evt: Event) => evt.preventDefault()}
                @click=${(evt: PointerEvent) => this.#onClickFilter(evt, index)}
                @close=${() => this.#onRemoveFilter(index)}
                closable
              >
                <span>${this.#filterFieldLabelMap[field]}</span>
                <span class="comparer">${this.getText(cType)}</span>
                <span>"${this.#getValueFromField(field, value).join(', ')}"</span>
              </dy-tag>
            `,
          )}
        </dy-scroll-box>
        <slot></slot>
      </div>
      <dy-table
        ${this.#tableRef}
        part="table-wrap"
        exportparts="table,tr,td,th"
        .getRowStyle=${this.getRowStyle}
        .getActions=${this.getActions}
        .expandedRowRender=${this.expandedRowRender}
        .data=${data}
        .columns=${this.#columns}
        .selectable=${this.selectable}
        .rowKey=${this.rowKey}
        .selection=${this.#state.selection}
        .selectionContainer=${this.#selectionContainer}
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
