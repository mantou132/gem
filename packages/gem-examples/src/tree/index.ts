import { connect, createStore, html, render, updateStore } from '@mantou/gem';

import 'duoyun-ui/elements/tree';

import '../elements/layout';

const store = createStore({
  selected: 'Item 3.3.1',
  data: [
    { label: 'Item 1' },
    { label: 'Item 2' },
    {
      label: 'Item 3',
      value: { type: 'folder', path: 'Item 3' },
      children: [
        { label: 'Item 3.1', status: 'notice' },
        { label: 'Item 3.2' },
        {
          label: 'Item 3.3',
          value: { type: 'folder', path: 'Item 3.3' },
          children: [{ label: 'Item 3.3.1', status: 'negative', tags: ['R', 'C'] }],
        },
      ],
    },
    { label: 'Item 4' },
    { label: 'Item 5', value: { type: 'folder', path: 'Item 5' }, children: [{ label: 'Item 5.1' }] },
  ],
});

function onSelected({ detail }: CustomEvent) {
  if (detail.type === 'folder') return;
  updateStore(store, { selected: detail });
}

function renderApp() {
  render(
    html`
      <gem-examples-layout>
        <div slot="main" style="display: flex">
          <dy-tree
            @itemclick=${onSelected}
            .highlights=${store.selected ? [store.selected] : undefined}
            .style=${'width: 240px;'}
            .data=${store.data}
          ></dy-tree>
          <pre style="flex-grow: 1; background: #eee; margin: 0; padding: 1em; font-size: 2em;">${store.selected}</pre>
        </div>
      </gem-examples-layout>
    `,
    document.body,
  );
}

connect(store, renderApp);

renderApp();
