import { html, render } from '@mantou/gem';

import { changePanelStore, PanelStore } from './store';

import './modules/panel';

render(
  html`
    <style>
      body {
        margin: 0;
      }
    </style>
    <devtools-panel></devtools-panel>
  `,
  document.body,
);

changePanelStore({
  ...new PanelStore(),
  observedAttributes: [
    { name: 'song-id', value: String(Date.now()), type: 'number' },
    { name: 'id', value: '', type: 'string' },
  ],
  observedProperties: [
    { name: 'list', value: '[1, 2]', type: 'object' },
    { name: 'config', value: '{a: "https://gemjs.org/#are-you-ready"}', type: 'object' },
  ],
  observedStores: [{ name: 'store', value: '{...}', type: 'object' }],
  lifecycleMethod: [{ name: 'render', value: 'function ()', type: 'function' }],
  method: [{ name: 'click', value: 'function ()', type: 'function' }],
  state: [{ name: 'loaded', value: true, type: 'boolean' }],
  properties: [
    { name: 'mute', value: 'true', type: 'boolean' },
    { name: 'data', value: 'null', type: 'object' },
  ],
  attributes: [{ name: 'title', value: 'Song ID', type: 'string' }],
});
