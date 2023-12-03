import { devtools } from 'webextension-polyfill';
import { customElement, GemElement, html, render } from '@mantou/gem';

import { getSelectedGem } from './scripts/get-gem';
import { changePanelStore, PanelStore } from './store';
import { getDomStat } from './scripts/dom-stat';
import { theme } from './theme';
import { execution } from './common';

import './modules/panel';

@customElement('devtools-gem-discover')
class GemDiscover extends GemElement {}

async function updateElementProperties() {
  try {
    const result = await execution(getSelectedGem, [
      new PanelStore(),
      Object.getOwnPropertySymbols(new GemDiscover()).map(String),
    ]);
    if (typeof result !== 'string') {
      changePanelStore(result);
    } else {
      changePanelStore(await execution(getDomStat, [new PanelStore({ isGemElement: false })]));
    }
  } catch (err) {
    console.error(err);
    changePanelStore(new PanelStore({ isGemElement: false }));
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
