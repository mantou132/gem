import { connect, createStore, html, render } from '@mantou/gem';
import type { Option } from 'duoyun-ui/elements/cascader-picker';
import { sleep } from 'duoyun-ui/lib/timer';

import 'duoyun-ui/elements/cascader-picker';
import 'duoyun-ui/elements/loading';

import '../elements/layout';

const store = createStore({
  selected: [['Item 3', 'Item 3.3', 'Item 3.3.1']],
  options: [
    { label: 'Item 1', disabled: true },
    { label: 'Item 2', childrenPlaceholder: html`<dy-loading />` },
    {
      label: 'Item 3',
      children: [
        { label: 'Item 3.1' },
        { label: 'Item 3.2', childrenPlaceholder: html`<dy-loading />` },
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
  store({ selected: detail });
}
let i = 10;
async function onExpand({ detail }: CustomEvent<Option>) {
  await sleep(1000);
  if (detail.label === 'Item 2') {
    detail.children = [];
    store({ options: [...store.options] });
  }
  if (detail.label === 'Item 3.2') {
    detail.children = [];
    store({ options: [...store.options] });
  }
  if (detail.label === 'Item 4') {
    detail.children = Array(i++)
      .fill(null)
      .map((_, index) => ({ label: `Item 4.${index + 1}` }));
    store({ options: [...store.options] });
  }
}

function renderApp() {
  render(
    html`
      <gem-examples-layout>
        <div>
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
