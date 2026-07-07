import { createPaginationStore } from 'duoyun-ui/helper/store';

import type { Item } from './api';
import { fetchAllItems } from './api';
import { ConsolePageItemElement } from './users';

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

  @template()
  #render = () => {
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
    `;
  };
}
