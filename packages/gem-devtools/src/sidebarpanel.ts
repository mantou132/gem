import { devtools } from 'webextension-polyfill';
import { customElement, GemElement, html, render } from '@mantou/gem';

import { getSelectedGem } from './scripts/get-gem';
import { changeStore, PanelStore } from './store';
import { getDomStat } from './scripts/dom-stat';
import { theme } from './theme';
import { execution } from './common';

import './modules/panel';

@customElement('devtools-gem-discover')
class GemDiscover extends GemElement {}

async function updateElementProperties() {
  const initData = new PanelStore();
  const data = await execution(getSelectedGem, [initData, Object.getOwnPropertySymbols(new GemDiscover()).map(String)]);
  if (data) {
    changeStore(data);
  } else {
    initData.isGemElement = false;
    changeStore(await execution(getDomStat, [initData]));
  }
}

devtools.panels.elements.onSelectionChanged.addListener(() => {
  scrollTo(0, 0);
  updateElementProperties();
});
updateElementProperties();
setInterval(updateElementProperties, 300);

render(
  html`
    <style>
      body {
        margin: 0;
        font-family: sans-serif;
        background: rgba(${theme.backgroundColorRGB}, 1);
        color: rgba(${theme.textColorRGB}, 1);
        -moz-osx-font-smoothing: grayscale;
        -webkit-font-smoothing: antialiased;
      }
    </style>
    <devtools-panel></devtools-panel>
  `,
  document.body,
);
