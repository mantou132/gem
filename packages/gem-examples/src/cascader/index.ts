import { connect, html, render, useStore } from '@mantou/gem';
import type { Option } from 'duoyun-ui/elements/cascader-picker';
import { sleep } from 'duoyun-ui/lib/utils';

import 'duoyun-ui/elements/cascader-picker';
import 'duoyun-ui/elements/loading';

import '../elements/layout';

const [store, update] = useStore({
  selected: [['Item 3', 'Item 3.3', 'Item 3.3.1']],
  options: [
    { label: 'Item 1' },
    { label: 'Item 2' },
    {
      label: 'Item 3',
      children: [
        { label: 'Item 3.1' },
        { label: 'Item 3.2' },
        {
          label: 'Item 3.3',
          children: [{ label: 'Item 3.3.1' }],
        },
      ],
    },
    { label: 'Item 4', childrenPlaceholder: html`<dy-loading />` },
    { label: 'Item 5', children: [{ label: 'Item 5.1' }] },
  ] as Option[],
});

function onChange({ detail }: CustomEvent) {
  update({ selected: detail });
}

async function onExpand({ detail }: CustomEvent<Option>) {
  await sleep(1000);
  if (detail.label === 'Item 4') {
    detail.children = Array(4)
      .fill(null)
      .map((_, index) => ({ label: `Item 4.${index + 1}` }));
    update({ options: [...store.options] });
  }
}

function renderApp() {
  render(
    html`
      <gem-examples-layout>
        <div slot="main">
          <dy-cascader-picker
            multiple
            .options=${store.options}
            .value=${store.selected}
            @change=${onChange}
            @expand=${onExpand}
          ></dy-cascader-picker>
        </div>
      </gem-examples-layout>
    `,
    document.body,
  );
}

connect(store, renderApp);

renderApp();
