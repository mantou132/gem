import { html, GemElement } from '@mantou/gem/lib/element';
import { get } from '@mantou/gem/helper/request';
import { connectStore, customElement } from '@mantou/gem/lib/decorators';
import { locationStore } from 'duoyun-ui/patterns/console';
import { Time } from 'duoyun-ui/lib/time';
import { ContextMenu } from 'duoyun-ui/elements/contextmenu';
import { FormItem, createForm } from 'duoyun-ui/patterns/form';
import { sleep } from 'duoyun-ui/lib/utils';
import type { FilterableColumn } from 'duoyun-ui/patterns/table';

import 'duoyun-ui/patterns/table';
import 'duoyun-ui/elements/button';

// 这个只是用来推断类型的
const EXAMPLE = {
  id: 1,
  name: 'Leanne Graham',
  username: 'Bret',
  email: 'Sincere@april.biz',
  address: {
    street: 'Kulas Light',
    suite: 'Apt. 556',
    city: 'Gwenborough',
    zipcode: '92998-3874',
    geo: {
      lat: '-37.3159',
      lng: '81.1496',
    },
  },
  phone: '1-770-736-8031 x56442',
  website: 'hildegard.org',
  company: {
    name: 'Romaguera-Crona',
    catchPhrase: 'Multi-layered client-server neural-net',
    bs: 'harness real-time e-markets',
  },
  updated: 0,
};

type Item = typeof EXAMPLE;

const initItem = {
  username: 'Mantou',
  name: '',
  company: {
    name: '',
    catchPhrase: '',
    bs: '',
  },
  updated: Date.now(),
};

type NewItem = typeof initItem;

type State = {
  list?: Item[];
};

@customElement('console-page-item')
@connectStore(locationStore)
export class ConsolePageItemElement extends GemElement<State> {
  state: State = {};

  // 定义表单
  #formItems: FormItem<NewItem>[] = [
    [
      {
        type: 'text',
        field: 'username',
        label: 'Username',
        required: true,
      },
      {
        type: 'text',
        field: 'name',
        label: 'Name',
      },
    ],
    {
      label: 'Company Info',
      group: [
        {
          type: 'text',
          field: ['company', 'name'],
          label: 'Company name',
        },
        {
          type: 'text',
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
    },
  ];

  // 定义表格
  #columns: FilterableColumn<Item>[] = [
    {
      title: 'No',
      dataIndex: 'id',
      width: '3em',
      data: {
        type: 'number',
      },
    },
    {
      title: 'Username',
      dataIndex: 'username',
      width: '7em',
      ellipsis: true,
    },
    {
      title: 'Company',
      render: (r) => r.company.name,
      data: {
        field: ['company', 'name'],
        type: 'enum',
        getOptions: () =>
          [
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
          ].map((label) => ({ label })),
      },
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      ellipsis: true,
    },
    {
      title: 'Updated',
      width: '7em',
      render: (r) => new Time().relativeTimeFormat(new Time(r.updated)),
      data: {
        field: 'updated',
        type: 'time',
      },
    },
    {
      title: '',
      getActions: (r, activeElement) => [
        {
          text: 'Edit',
          handle: () => {
            createForm<NewItem>({
              data: r,
              header: `Edit: ${r.id}`,
              formItems: this.#formItems,
              prepareOk: async (data) => {
                await sleep(1000);
                console.log(data);
                throw new Error('No implement!');
              },
            }).catch((data) => {
              console.log(data);
            });
          },
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
      ],
    },
  ];

  #onCreate = () => {
    createForm<NewItem>({
      type: 'modal',
      data: initItem,
      header: `Create`,
      formItems: this.#formItems,
      prepareOk: async (data) => {
        await sleep(1000);
        console.log(data);
        throw new Error('No implement!');
      },
    }).catch((data) => {
      console.log(data);
    });
  };

  mounted = () => {
    console.log(locationStore.params.id);
    get(`https://jsonplaceholder.typicode.com/users`).then((list: Item[]) => {
      list.forEach((e, i) => (e.updated = new Time().subtract(i + 1, 'd').getTime()));
      this.setState({ list });
    });
  };

  render = () => {
    return html`
      <dy-pat-table filterable .pagesize=${5} .data=${this.state.list} .columns=${this.#columns}>
        <dy-button @click=${this.#onCreate}>Add</dy-button>
      </dy-pat-table>
      <style>
        dy-pat-table::part(table) {
          min-width: 40em;
        }
      </style>
    `;
  };
}
