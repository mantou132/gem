import { customElement, type Emitter, effect, emitter, mounted } from '@mantou/gem/lib/decorators';
import { createState, GemElement, html } from '@mantou/gem/lib/element';
import type { ContextMenuItem } from 'duoyun-ui/elements/contextmenu';
import { ContextMenu } from 'duoyun-ui/elements/contextmenu';
import { createPaginationStore } from 'duoyun-ui/helper/store';
import { Time } from 'duoyun-ui/lib/time';
import { sleep } from 'duoyun-ui/lib/timer';
import type { Modify } from 'duoyun-ui/lib/types';
import type { FormItem } from 'duoyun-ui/patterns/form';
import { createForm } from 'duoyun-ui/patterns/form';
import type { FetchEventDetail, PatTableColumn } from 'duoyun-ui/patterns/table';

import type { Item } from './api';
import { fetchItemsWithArgs } from './api';

import 'duoyun-ui/patterns/table';
import 'duoyun-ui/elements/button';

import { history } from '@mantou/gem/lib/history';

const pagination = createPaginationStore<Item>({
  storageKey: 'users',
  cacheItems: true,
  pageContainItem: true,
});

const initItem = {
  social: [''],
  username: 'Mantou',
  name: '',
  company: {
    name: '',
    catchPhrase: '',
    bs: '',
  },
  updated: Date.now(),
};

type NewItem = Modify<typeof initItem, { social?: string[] }>;

@customElement('console-page-users')
export class ConsolePageItemElement extends GemElement {
  @emitter loaded: Emitter;

  #state = createState({
    pagination: pagination,
    paginationMap: new Map([['', pagination]]),
  });

  // 定义表格
  columns: PatTableColumn<Item>[] = [
    {
      title: 'No',
      dataIndex: 'id',
      width: '4em',
      sortable: true,
      filterOptions: {
        type: 'number',
      },
    },
    {
      title: 'Username',
      dataIndex: 'username',
      width: '8em',
      ellipsis: true,
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      width: '12em',
      ellipsis: true,
      filterOptions: false,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      width: '15em',
      sortable: true,
    },
    {
      title: 'Address',
      dataIndex: ['address', 'street'],
      width: '15em',
      visibleWidth: 'auto',
    },
    {
      title: 'Company',
      width: '10em',
      visibleWidth: 'auto',
      render: (r) => r.company.name,
      filterOptions: {
        field: ['company', 'name'],
        type: 'enum',
        getOptions: () => {
          return [
            'Romaguera-Crona',
            'Deckow-Crist',
            'Romaguera-Jacobson',
            'Robel-Corkery',
            'Keebler LLC',
            'Considine-Lockman',
            'Johns Group',
            'Abernathy Group',
            'Yost and Sons',
            'Hoeger LLC',
          ].map((label) => ({ label }));
        },
      },
    },
    {
      title: 'Updated',
      width: '8em',
      visibleWidth: 'auto',
      render: (r) => new Time().relativeTimeFormat(new Time(r.updated)),
      filterOptions: {
        field: 'updated',
        type: 'date-time',
      },
    },
  ];

  getActions = (r: Item, activeElement: HTMLElement): ContextMenuItem[] => [
    {
      text: 'Edit',
      handle: () => this.onUpdate(r),
    },
    {
      text: 'VIP',
      selected: true,
      disabled: true,
      handle: console.log,
    },
    {
      text: 'Disable',
      handle: console.log,
    },
    { text: '---' },
    {
      text: 'Delete',
      danger: true,
      handle: async () => {
        await ContextMenu.confirm(`Confirm delete ${r.username}?`, { activeElement, danger: true });
        console.log('Delete: ', r);
      },
    },
  ];

  // 定义表单
  getFormItems = (isEdit?: boolean): FormItem<NewItem>[] => [
    [
      {
        type: 'text',
        field: 'username',
        label: 'Username',
        required: true,
        disabled: isEdit,
        style: {
          flexGrow: 5,
        },
        async getOptions(input) {
          await sleep(300);
          return Array(4)
            .fill(null)
            .map((_, index) => ({ label: `${input}-${index}` }));
        },
      },
      {
        type: 'text',
        field: 'name',
        label: 'Username',
        disabled: isEdit,
        placeholder: 'Please input name',
        update(data) {
          return { ignore: !data.username };
        },
      },
    ],
    {
      type: 'text',
      field: ['social'],
      label: 'Social',
      list: {
        initItem: '',
        sortable: true,
      },
    },
    {
      label: 'Company Info',
      fieldset: [
        {
          type: 'text',
          field: ['company', 'name'],
          label: 'Company name',
        },
        {
          type: 'textarea',
          rows: 0,
          field: ['company', 'catchPhrase'],
          label: 'Company Catch phrase',
        },
        {
          type: 'text',
          field: ['company', 'bs'],
          label: 'Company bs',
        },
      ],
    },
    {
      type: 'date-time',
      field: 'updated',
      label: 'Last Updated',
      dependencies: ['username'],
      getInitValue(data) {
        if (data.username === 'now') {
          return Date.now();
        }
      },
    },
  ];

  onUpdate = (r: Item) => {
    createForm<Item>({
      data: r,
      header: `Edit: ${r.id}`,
      query: ['id', r.id],
      formItems: this.getFormItems(true),
      prepareClose: (data) => {
        console.log(data);
      },
      prepareOk: async (data) => {
        await sleep(1000);
        console.log(data);
        this.#state.pagination.updateItem(data);
      },
    });
  };

  onCreate = () => {
    createForm<NewItem>({
      type: 'modal',
      data: initItem,
      header: `Create`,
      query: ['new', true],
      formItems: this.getFormItems(),
      prepareClose: (data) => {
        console.log(data);
      },
      prepareOk: async (data) => {
        await sleep(1000);
        console.log(data);
        throw new Error('No implement!');
      },
    });
  };

  @mounted()
  #init = async () => {
    const { query } = history.getParams();
    if (query.get('new')) {
      this.onCreate();
    }
    const id = query.get('id');
    if (id) {
      await new Promise((res) => this.addEventListener('loaded', res, { once: true }));
      const item = this.#state.pagination.store.items[id];
      item && this.onUpdate(item);
    }
  };

  /**
   * 将搜索/过滤结果储存进内存 `PaginationStore`
   * 被根据 `searchAndFilterKey` 进行缓存
   * 这里使用页面级缓存，切换页面后将被清除
   */
  #onFetch = async ({ detail }: CustomEvent<FetchEventDetail>) => {
    let newPagination = this.#state.paginationMap.get(detail.pageKey);
    if (!newPagination) {
      newPagination = createPaginationStore<Item>({
        cacheItems: true,
        pageContainItem: true,
      });
      this.#state.paginationMap.set(detail.pageKey, newPagination);
    }
    this.#state({ pagination: newPagination });
    await newPagination.updatePage(fetchItemsWithArgs, detail);
    this.loaded();
  };

  render = () => {
    return html`
      <dy-pat-table
        filterable
        .columns=${this.columns}
        .paginationStore=${this.#state.pagination.store}
        .getActions=${this.getActions}
        @fetch=${this.#onFetch}
      >
        <dy-button @click=${this.onCreate}>Add</dy-button>
      </dy-pat-table>

      <style>
        dy-pat-table::part(table) {
          min-width: 40em;
        }
      </style>
    `;
  };
}
