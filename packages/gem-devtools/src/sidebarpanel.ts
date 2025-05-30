import { html, render } from '@mantou/gem';
import { logger } from '@mantou/gem/helper/logger';
import { devtools } from 'webextension-polyfill';

import { execution } from './common';
import { getDomStat } from './scripts/dom-stat';
import { getSelectedGem } from './scripts/get-gem';
import { PanelStore, panelStore } from './store';
import { theme } from './theme';

import './modules/panel';

async function updateElementProperties() {
  try {
    const result = await execution(getSelectedGem, [new PanelStore()]);
    if (typeof result !== 'string') {
      panelStore(result);
    } else {
      logger.info(result);
      panelStore(await execution(getDomStat, [new PanelStore({ isGemElement: false })]));
    }
  } catch (err) {
    logger.error(err);
    panelStore(new PanelStore({ isGemElement: false }));
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
      html {
        scrollbar-width: thin;
      }
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
