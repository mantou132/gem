import { devtools } from 'webextension-polyfill';
import { customElement, GemElement, html, render, SheetToken } from '@mantou/gem';

import { getSelectedGem } from './scripts/get-gem';
import { inspectValue } from './scripts/inspect-value';
import { changeStore, PanelStore, Path } from './store';
import { theme } from './theme';

import './elements/panel';

/**
 * execution script in page
 * @param func A function that can be converted into a string and does not rely on external variables
 * @param args Array serializable using JSON
 */
async function execution(func: (...rest: any) => any, args: any[]) {
  const [data, error] = await devtools.inspectedWindow.eval(
    `(${func.toString()}).apply(null, ${JSON.stringify(args)})`,
  );
  if (error) {
    throw error;
  }
  return data;
}

@customElement('devtools-gem-discover')
class GemDiscover extends GemElement {}

async function updateElementProperties() {
  const data = await execution(getSelectedGem, [
    new PanelStore(),
    Object.getOwnPropertySymbols(new GemDiscover()).map(String),
  ]);
  changeStore(data);
}

devtools.panels.elements.onSelectionChanged.addListener(updateElementProperties);
updateElementProperties();
setInterval(updateElementProperties, 300);

addEventListener('valueclick', ({ detail }: CustomEvent<Path>) => {
  execution(inspectValue, [detail, String(SheetToken)]);
});

render(
  html`
    <style>
      body {
        margin: 0;
        font-family: sans-serif;
        background: rgba(${theme.backgroundColorRGB}, 1);
        color: rgba(${theme.textColorRGB}, 1);
      }
    </style>
    <devtools-panel></devtools-panel>
  `,
  document.body,
);
