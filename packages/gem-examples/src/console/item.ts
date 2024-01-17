import { html, GemElement } from '@mantou/gem/lib/element';
import { get } from '@mantou/gem/helper/request';
import { connectStore, customElement } from '@mantou/gem/lib/decorators';
import { locationStore } from 'duoyun-ui/patterns/console';
import { Time } from 'duoyun-ui/lib/time';
import type { FilterableColumn } from 'duoyun-ui/patterns/table';

import 'duoyun-ui/patterns/table';

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

type State = {
  list?: Item[];
};

@customElement('console-page-item')
@connectStore(locationStore)
export class ConsolePageItemElement extends GemElement<State> {
  state: State = {};

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
  ];

  mounted = () => {
    console.log(locationStore.params.id);
    get(`https://jsonplaceholder.typicode.com/users`).then((list: Item[]) => {
      list.forEach((e) => (e.updated = Date.now() - 30 * 24 * 60 * 60 * 1000 * Math.random()));
      this.setState({ list });
    });
  };

  render = () => {
    return html`
      <dy-pat-table filterable .data=${this.state.list} .pagesize=${5} .columns=${this.#columns}></dy-pat-table>
      <style>
        dy-pat-table::part(table) {
          min-width: 40em;
        }
      </style>
    `;
  };
}
