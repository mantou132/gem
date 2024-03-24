import { html } from '@mantou/gem/lib/element';
import { connectStore, customElement } from '@mantou/gem/lib/decorators';
import { createPaginationStore } from 'duoyun-ui/helper/store';

import { ConsolePageItemElement } from './item';
import { Item, fetchAllItems } from './api';

import 'duoyun-ui/patterns/table';
import 'duoyun-ui/elements/button';

const { store, updatePage } = createPaginationStore<Item>({
  storageKey: 'users-client-search',
  cacheItems: true,
  pageContainItem: true,
});

@customElement('console-page-item-client')
@connectStore(store)
export class ConsolePageItemClientElement extends ConsolePageItemElement {
  constructor() {
    super();
    this.effect(
      () => updatePage(fetchAllItems),
      () => [],
    );
  }
  render = () => {
    return html`
      <dy-pat-table filterable .columns=${this.columns} .pagesize=${5} .data=${store.getData()}>
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
