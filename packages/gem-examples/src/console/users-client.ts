import { connectStore, customElement, mounted } from '@mantou/gem/lib/decorators';
import { html } from '@mantou/gem/lib/element';
import { createPaginationStore } from 'duoyun-ui/helper/store';

import type { Item } from './api';
import { fetchAllItems } from './api';
import { ConsolePageItemElement } from './users';

import 'duoyun-ui/patterns/table';
import 'duoyun-ui/elements/button';

const { store, updatePage } = createPaginationStore<Item>({
  storageKey: 'users-client-search',
  cacheItems: true,
  pageContainItem: true,
});

@customElement('console-page-users-client')
@connectStore(store)
export class ConsolePageItemClientElement extends ConsolePageItemElement {
  @mounted()
  #fetch = () => updatePage(fetchAllItems);

  render = () => {
    return html`
      <dy-pat-table
        filterable
        .getActions=${this.getActions}
        .columns=${this.columns}
        .selectable=${true}
        .pagesize=${9}
        .data=${store.getData()}
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
