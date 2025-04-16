import { connect, createStore, html, render } from '@mantou/gem';
import { ContextMenu } from 'duoyun-ui/elements/contextmenu';
import type { MouseEventDetail, TreeItem } from 'duoyun-ui/elements/tree';
import { sleep } from 'duoyun-ui/lib/timer';

import 'duoyun-ui/elements/tree';
import 'duoyun-ui/elements/loading';

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
    {
      label: 'Item 4',
      value: { type: 'folder', path: 'Item 4' },
      childrenPlaceholder: html`<dy-loading />`,
    },
    { label: 'Item 5', value: { type: 'folder', path: 'Item 5' }, children: [{ label: 'Item 5.1' }] },
  ] as TreeItem[],
});

async function onExpand({ detail }: CustomEvent<TreeItem>) {
  await sleep(1000);
  if (detail.label === 'Item 4') {
    detail.children = Array(4)
      .fill(null)
      .map((_, index) => ({ label: `Item 4.${index + 1}` }));
    store({ data: [...store.data] });
  }
}

function onClick({ detail }: CustomEvent<MouseEventDetail>) {
  if (detail.value.type === 'folder') return;
  store({ selected: detail.value });
}

function onContextMenu({ detail }: CustomEvent<MouseEventDetail>) {
  ContextMenu.open([{ text: 'Menu 1' }, { text: 'Menu 2' }, { text: 'Menu 3' }, { text: 'Menu 4' }], {
    activeElement: detail.originEvent.target as HTMLElement,
    x: detail.originEvent.x,
    y: detail.originEvent.y,
  });
}

function renderApp() {
  render(
    html`
      <gem-examples-layout>
        <div style="display: flex">
          <dy-tree
            @contextmenu=${(e: MouseEvent) => e.preventDefault()}
            @itemcontextmenu=${onContextMenu}
            @itemclick=${onClick}
            @expand=${onExpand}
            .highlights=${store.selected ? [store.selected] : undefined}
            .style=${'width: 240px;'}
            .items=${store.data}
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
